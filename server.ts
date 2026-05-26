import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Room, Question, Participant, RoomStatus } from './src/types.js';

// Resolve directory name safely in both ESM (development) and CJS (production)
let currentDirname = '';
try {
  currentDirname = __dirname;
} catch {
  const filename = fileURLToPath(import.meta.url);
  currentDirname = path.dirname(filename);
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Memory store for the real-time exam rooms
const rooms: { [id: string]: Room } = {};
// Store for active simulation timeouts
const botIntervals: { [roomId: string]: NodeJS.Timeout | null } = {};

// Helpful helper to make an uppercase alphanumeric code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --------------------------------------------------------
// API Endpoints
// --------------------------------------------------------

// Get list of active public rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Object.values(rooms).map(room => ({
    id: room.id,
    title: room.title,
    status: room.status,
    participantCount: room.participants.length,
    questionCount: room.questions.length,
    isTeacherLed: room.isTeacherLed,
    createdAt: room.createdAt,
  }));
  res.json(roomList);
});

// Create a new exam room
app.post('/api/rooms', (req, res) => {
  const { title, questions, isTeacherLed, passcode } = req.body;
  
  if (!title || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: '유효한 시험 제목과 문제 배열이 필요합니다.' });
  }

  const roomId = generateRoomCode();
  const room: Room = {
    id: roomId,
    title: title.trim(),
    status: 'waiting',
    questions: questions.map((q: any, i: number) => ({
      id: q.id || `q-${i}-${Date.now()}`,
      text: q.text,
      options: q.options || [],
      correctOptionIndex: Number(q.correctOptionIndex) ?? 0,
      points: Number(q.points) || 10,
    })),
    participants: [],
    createdAt: Date.now(),
    teacherPasscode: passcode || 'admin',
    isTeacherLed: !!isTeacherLed,
    currentQuestionIndex: 0,
  };

  rooms[roomId] = room;
  res.status(201).json(room);
});

// Get a single room's details
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId.toUpperCase()];
  
  if (!room) {
    return res.status(404).json({ error: '해당 시험 방을 찾을 수 없습니다.' });
  }

  // If client passes teacher passcode in header or query, return full info
  const clientPasscode = req.headers['x-teacher-passcode'] || req.query.passcode;
  const isTeacher = clientPasscode === room.teacherPasscode;

  if (isTeacher) {
    return res.json(room);
  }

  // Student mode - don't reveal correct options!
  const sanitizedQuestions = room.questions.map(q => {
    const { correctOptionIndex, ...publicQuestions } = q;
    return publicQuestions;
  });

  res.json({
    id: room.id,
    title: room.title,
    status: room.status,
    isTeacherLed: room.isTeacherLed,
    currentQuestionIndex: room.currentQuestionIndex,
    questions: sanitizedQuestions,
    // Return basic participant info without explicit answers or sensitive score indicators if test is running
    participants: room.participants.map(p => ({
      id: p.id,
      name: p.name,
      currentQuestionIndex: p.currentQuestionIndex,
      isCompleted: p.isCompleted,
      isBot: p.isBot,
      // Only show details if isCompleted or exam completed
      score: (room.status === 'completed' || p.isCompleted) ? p.score : undefined,
    })),
  });
});

// Join as a participant
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { name, isBot } = req.body;
  const uRoomId = roomId.toUpperCase();
  const room = rooms[uRoomId];

  if (!room) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }

  if (room.status === 'completed') {
    return res.status(400).json({ error: '이미 마감(종료)된 시험 방입니다.' });
  }

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: '유효한 이름을 입력해주세요.' });
  }

  // Prevent duplicated name in this specific room
  const cleanName = name.trim();
  const existing = room.participants.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
  
  if (existing) {
    // Re-join existing student
    return res.json({
      room,
      participantId: existing.id,
      message: '기존 계정으로 다시 접속합니다.',
    });
  }

  const newParticipant: Participant = {
    id: isBot ? `bot-${Math.random().toString(36).substr(2, 5)}` : `student-${Math.random().toString(36).substr(2, 5)}`,
    name: cleanName,
    answers: {},
    score: 0,
    currentQuestionIndex: 0,
    isCompleted: false,
    isBot: !!isBot,
  };

  room.participants.push(newParticipant);
  res.status(201).json({ room, participantId: newParticipant.id });
});

// Update Room status (Teacher-only)
app.post('/api/rooms/:roomId/status', (req, res) => {
  const { roomId } = req.params;
  const { status, isTeacherLed } = req.body;
  const room = rooms[roomId.toUpperCase()];

  if (!room) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }

  const clientPasscode = req.headers['x-teacher-passcode'];
  if (clientPasscode !== room.teacherPasscode) {
    return res.status(403).json({ error: '인증 권한이 필요한 조작입니다.' });
  }

  if (status) {
    room.status = status as RoomStatus;
    if (status === 'completed' || status === 'paused') {
      // Pause simulation
    }
  }
  if (isTeacherLed !== undefined) {
    room.isTeacherLed = !!isTeacherLed;
  }

  res.json({ message: '시험 관리자 정보가 반영되었습니다.', room });
});

// Update current question index (Teacher-led question change)
app.post('/api/rooms/:roomId/question', (req, res) => {
  const { roomId } = req.params;
  const { index } = req.body;
  const room = rooms[roomId.toUpperCase()];

  if (!room) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }

  const clientPasscode = req.headers['x-teacher-passcode'];
  if (clientPasscode !== room.teacherPasscode) {
    return res.status(403).json({ error: '선생님 본인 인증 코드가 맞지 않습니다.' });
  }

  if (index < 0 || index >= room.questions.length) {
    return res.status(400).json({ error: '올바르지 않은 문제 색인 범위입니다.' });
  }

  room.currentQuestionIndex = index;
  res.json({ message: `전체 학생들의 진행 문제가 ${index + 1}단계로 전송되었습니다.`, room });
});

// Student answers a question
app.post('/api/rooms/:roomId/submit', (req, res) => {
  const { roomId } = req.params;
  const { participantId, questionId, selectedOptionIndex } = req.body;
  const room = rooms[roomId.toUpperCase()];

  if (!room) {
    return res.status(404).json({ error: '해당 시험 방을 찾을 수 없습니다.' });
  }

  if (room.status !== 'active') {
    return res.status(400).json({ error: '현재 시험 진행 기간이 아닙니다. 대기 혹은 일시중지 상태입니다.' });
  }

  const participant = room.participants.find(p => p.id === participantId);
  if (!participant) {
    return res.status(404).json({ error: '등록되지 않은 참가자 정보입니다.' });
  }

  if (participant.isCompleted) {
    return res.status(400).json({ error: '이미 최종 제출이 마감되었습니다.' });
  }

  const question = room.questions.find(q => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: '존재하지 않는 문항 ID 입니다.' });
  }

  // Record answer
  const isUpdating = participant.answers[questionId] !== undefined;
  participant.answers[questionId] = selectedOptionIndex;

  // Recalculate total score
  let newScore = 0;
  room.questions.forEach((q) => {
    const ans = participant.answers[q.id];
    if (ans === q.correctOptionIndex) {
      newScore += q.points;
    }
  });
  participant.score = newScore;

  // Track progress index
  const qIndex = room.questions.findIndex(q => q.id === questionId);
  if (qIndex !== -1 && !room.isTeacherLed) {
    // If self paced, and student is solving their latest active question, increment to show current
    if (participant.currentQuestionIndex === qIndex) {
      participant.currentQuestionIndex = Math.min(room.questions.length - 1, qIndex + 1);
    }
  }

  // Check if they completed all questions
  const answeredCount = Object.keys(participant.answers).length;
  if (answeredCount >= room.questions.length) {
    participant.isCompleted = true;
    participant.completedAt = Date.now();
    participant.currentQuestionIndex = room.questions.length; // 100% complete
  }

  res.json({
    message: '답안이 정상 기록되었습니다.',
    score: participant.score,
    isCompleted: participant.isCompleted,
    currentQuestionIndex: participant.currentQuestionIndex,
  });
});

// Reset room (clear scores/participants) (Teacher-only)
app.delete('/api/rooms/:roomId/reset', (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId.toUpperCase()];

  if (!room) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }

  const clientPasscode = req.headers['x-teacher-passcode'];
  if (clientPasscode !== room.teacherPasscode) {
    return res.status(403).json({ error: '권한 검증이 맞지 않습니다.' });
  }

  // Clear participants and resetting stats
  room.participants = [];
  room.status = 'waiting';
  room.currentQuestionIndex = 0;

  // Stop simulation if running
  if (botIntervals[room.id]) {
    clearInterval(botIntervals[room.id]!);
    botIntervals[room.id] = null;
  }

  res.json({ message: '시험 데이터공간이 리셋되었습니다.', room });
});

// Bot Simulation Endpoint (Teacher-only)
app.post('/api/rooms/:roomId/bots', (req, res) => {
  const { roomId } = req.params;
  const { action, count = 5 } = req.body;
  const room = rooms[roomId.toUpperCase()];

  if (!room) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }

  const clientPasscode = req.headers['x-teacher-passcode'];
  if (clientPasscode !== room.teacherPasscode) {
    return res.status(403).json({ error: '권한이 없습니다.' });
  }

  if (action === 'start') {
    // Stop previous if exists
    if (botIntervals[room.id]) {
      clearInterval(botIntervals[room.id]!);
      botIntervals[room.id] = null;
    }

    // Register simulated robot students
    const names = [
      '김민수(Bot)', '이서하(Bot)', '박준우(Bot)', '최지아(Bot)', '정하윤(Bot)',
      '강도윤(Bot)', '조수아(Bot)', '윤우진(Bot)', '임예나(Bot)', '한서준(Bot)',
      '오세호(Bot)', '배현경(Bot)', '송나래(Bot)', '전우석(Bot)', '권혁식(Bot)'
    ];

    const botsToInject = Math.min(count, names.length);
    for (let i = 0; i < botsToInject; i++) {
      const name = names[i];
      // Check if already in participants
      if (!room.participants.some(p => p.name === name)) {
        room.participants.push({
          id: `bot-${Math.random().toString(36).substr(2, 5)}`,
          name,
          answers: {},
          score: 0,
          currentQuestionIndex: 0,
          isCompleted: false,
          isBot: true,
        });
      }
    }

    // Start background simulation cycle
    botIntervals[room.id] = setInterval(() => {
      if (room.status !== 'active') return; // Only process when test is live!

      // Filter unsolved bots
      const activeBots = room.participants.filter(p => p.isBot && !p.isCompleted);
      if (activeBots.length === 0) {
        clearInterval(botIntervals[room.id]!);
        botIntervals[room.id] = null;
        return;
      }

      // 1 or 2 bots solve a question in this tick
      const solCount = Math.floor(Math.random() * 2) + 1;
      for (let s = 0; s < solCount; s++) {
        const randBot = activeBots[Math.floor(Math.random() * activeBots.length)];
        if (!randBot) continue;

        let qToSolve: Question | undefined;
        if (room.isTeacherLed) {
          // Bots solve current teacher led index
          qToSolve = room.questions[room.currentQuestionIndex];
        } else {
          // Bots solve their self-paced currentQuestionIndex
          qToSolve = room.questions[randBot.currentQuestionIndex];
        }

        if (qToSolve) {
          // Decide answer (with 70% chance of picking correctOptionIndex)
          const pickCorrect = Math.random() < 0.75;
          let ansIndex = qToSolve.correctOptionIndex;
          if (!pickCorrect && qToSolve.options.length > 1) {
            // Find another option
            const incorrectList = qToSolve.options
              .map((_, idx) => idx)
              .filter(idx => idx !== qToSolve!.correctOptionIndex);
            ansIndex = incorrectList[Math.floor(Math.random() * incorrectList.length)];
          }

          randBot.answers[qToSolve.id] = ansIndex;

          // Recompute bot scores
          let botScore = 0;
          room.questions.forEach((q) => {
            const cans = randBot.answers[q.id];
            if (cans === q.correctOptionIndex) {
              botScore += q.points;
            }
          });
          randBot.score = botScore;

          if (room.isTeacherLed) {
            // Check if they answered all available up to now
            const answeredCount = Object.keys(randBot.answers).length;
            if (answeredCount >= room.questions.length) {
              randBot.isCompleted = true;
              randBot.completedAt = Date.now();
            }
          } else {
            // Self-paced gets advanced
            randBot.currentQuestionIndex++;
            if (randBot.currentQuestionIndex >= room.questions.length) {
              randBot.isCompleted = true;
              randBot.completedAt = Date.now();
            }
          }
        }
      }
    }, 2000);

    return res.json({ message: `${botsToInject}명의 가상(로봇) 학생들이 주입되었으며 실시간 풀이가 전송되기 시작합니다.`, room });
  } else {
    // Stop simulation
    if (botIntervals[room.id]) {
      clearInterval(botIntervals[room.id]!);
      botIntervals[room.id] = null;
    }
    // Remove bots
    room.participants = room.participants.filter(p => !p.isBot);
    return res.json({ message: '로봇 학생 주입 및 시뮬레이션이 종료되었습니다.', room });
  }
});

// Import Gukak Quiz from external URL (Scraping and fallback logic)
app.post('/api/rooms/import-gukak', async (req, res) => {
  const { url = 'https://rust-five-34.vercel.app/' } = req.body;
  
  try {
    let targetUrl = url.trim();
    if (!targetUrl) {
      targetUrl = 'https://rust-five-34.vercel.app/';
    }
    
    // Auto-complete missing protocol
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    let parsedQuestions: any[] = [];
    let loadMethod = 'network';

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      
      // Scan for index asset bundle (case insensitive and supports optional leading slash)
      const assetMatches = html.match(/\/?assets\/index-[a-zA-Z0-9_-]+\.js/i);
      let jsUrl = '';
      if (assetMatches) {
        jsUrl = new URL(assetMatches[0], targetUrl).toString();
      } else {
        const genericScriptMatch = html.match(/src=["']([^"']+\.js)["']/i);
        if (genericScriptMatch) {
          jsUrl = new URL(genericScriptMatch[1], targetUrl).toString();
        }
      }

      if (jsUrl) {
        const jsResponse = await fetch(jsUrl);
        if (jsResponse.ok) {
          const jsText = await jsResponse.text();
          
          // Heuristic parser for quiz questions in react bundles
          // Look for 'const hr=[' array in the bundle
          const startIdx = jsText.indexOf('const hr=[');
          if (startIdx !== -1) {
            const startIndex = jsText.indexOf('[', startIdx);
            let bracketCount = 0;
            let endIdx = -1;
            for (let i = startIndex; i < jsText.length; i++) {
              if (jsText[i] === '[') {
                bracketCount++;
              } else if (jsText[i] === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                  endIdx = i;
                  break;
                }
              }
            }
            if (endIdx !== -1) {
              const arrayStr = jsText.substring(startIndex, endIdx + 1);
              try {
                // Safe parsing using functionally scoped evaluation
                const parsed = new Function(`return ${arrayStr}`)();
                if (Array.isArray(parsed) && parsed.length > 0) {
                  parsedQuestions = parsed.map((q: any) => {
                    let text = q.question;
                    let options = q.options || [];
                    let correctOptionIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
                    
                    if (q.type === 'matching') {
                      text = `${q.question}\n\n[짝짓기 정보]\n` + q.matchingPairs.map((p: any) => `- ${p.left} ↔ ${p.right}`).join('\n');
                      options = [
                        '바르게 연결되었습니다. (확인 완료)',
                        '잘못 연관된 항목이 있습니다.',
                        '다시 한 번 검토하겠습니다.',
                        '정답 제출'
                      ];
                      correctOptionIndex = 0;
                    }
                    
                    return {
                      id: `gukak-${q.id}`,
                      text,
                      options: options.slice(0, 4),
                      correctOptionIndex: correctOptionIndex < options.length ? correctOptionIndex : 0,
                      points: 20
                    };
                  });
                  console.log("Dynamically parsed Gukak quiz bundle successfully! Total count:", parsedQuestions.length);
                }
              } catch (e) {
                console.error("Failed to parse evaluation of parsed questions:", e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.warn("External fetch failed, switching to local updated cache fallback:", err.message);
    }
    
    // Falling back to the official complete set of Gukak questions
    if (parsedQuestions.length === 0) {
      loadMethod = 'cache';
      try {
        const defaultPath = path.join(process.cwd(), 'gukak_questions_default.json');
        if (fs.existsSync(defaultPath)) {
          const rawData = fs.readFileSync(defaultPath, 'utf-8');
          parsedQuestions = JSON.parse(rawData);
          console.log("Loaded fallback from official Gukak quiz JSON! Count:", parsedQuestions.length);
        }
      } catch (err) {
        console.error("Error reading default gukak questions:", err);
      }
    }
    
    // Absolute failsafe block
    if (parsedQuestions.length === 0) {
      parsedQuestions = [
        {
          id: 'gukak-q1',
          text: '삼국사기에 기록된 가야의 전통 악기이자 오동나무 판에 안족을 얹고 명주실 12줄을 튕겨 고운 소리를 내는 가현악기는 무엇일까요?',
          options: ['가야금', '거문고', '아쟁', '비파'],
          correctOptionIndex: 0,
          points: 20,
        }
      ];
    }
    
    res.json({
      title: '국악(國樂) 교육용 실시간 퀴즈 평가',
      questions: parsedQuestions,
      url: targetUrl,
      loadMethod
    });
  } catch (err: any) {
    res.status(500).json({ error: `국악 퀴즈 파싱 로더 가동 중 에러: ${err.message}` });
  }
});

// Pre-create generic static room so the app is instantly usable
const defaultQuiz = {
  id: 'math-101',
  text: '선생님과 학생들의 실시간 매칭 채널 예시방입니다.',
};
rooms['DEMO'] = {
  id: 'DEMO',
  title: '네트워크 & 웹 애플리케이션 테스트',
  status: 'waiting',
  questions: [
    { id: 'd1', text: '인터넷 브라우저 주소창에 HTTP 연결이 아닌 안전한 웹을 뜻하며 데이터 전송 암호화를 제공하는 표준 보안 규격은?', options: ['FTP', 'SSH', 'HTTPS', 'HTTP'], correctOptionIndex: 2, points: 25 },
    { id: 'd2', text: '웹 브라우저에서 HTML 태그를 해석하여 인터랙티브한 화면 레이아웃과 폰트 색상을 입히는 선언형 스타일 구성 언어는?', options: ['CSS', 'JSON', 'Docker', 'YAML'], correctOptionIndex: 0, points: 25 },
    { id: 'd3', text: '이 실시간 웹 시뮬레이터 프로그램에서 선생님 대시보드가 활용하고 있는 실시간 데이터 전달 및 렌더링 방식 메커니즘은?', options: ['블록체인 싱크', '주기적 HTTP polling 방식', 'CD-ROM 로더', '물리 저장 시디 보관'], correctOptionIndex: 1, points: 25 },
    { id: 'd4', text: '현대 웹 설계에서 클라이언트(브라우저)와 리소스 공급 서버 사이를 매끄럽게 연결하고 비동기 제어로 화면 새로고침 없이 정보를 바꾸는 브라우저 통신 기술은?', options: ['COBOL', 'FORTRAN', 'PASCAL', 'AJAX/Fetch API'], correctOptionIndex: 3, points: 25 },
  ],
  participants: [
    { id: 'student-demo-1', name: '이민아(시범참석)', answers: {}, score: 0, currentQuestionIndex: 0, isCompleted: false },
    { id: 'student-demo-2', name: '장영호(시범참석)', answers: {}, score: 0, currentQuestionIndex: 0, isCompleted: false }
  ],
  createdAt: Date.now(),
  teacherPasscode: '1234',
  isTeacherLed: false,
  currentQuestionIndex: 0,
};

// Start simulation on DEMO room directly to keep it live!
setTimeout(() => {
  // Let DEMO room start with 3 simulated bot students already
  const droom = rooms['DEMO'];
  if (droom) {
    const defaultBots = ['로봇김(Bot)', '로봇이(Bot)', '로봇박(Bot)'];
    defaultBots.forEach(botName => {
      droom.participants.push({
        id: `bot-${Math.random().toString(36).substr(2, 5)}`,
        name: botName,
        answers: {},
        score: 0,
        currentQuestionIndex: 0,
        isCompleted: false,
        isBot: true,
      });
    });
  }
}, 1000);


// --------------------------------------------------------
// Vite Development or Static Production Mode Setup
// --------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Exam Server listening on port ${PORT}`);
  });
}

startServer();
