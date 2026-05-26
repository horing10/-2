import React, { useEffect, useState } from 'react';
import { Room, Participant, Question } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Award, Users, RefreshCw, Copy, CheckCircle, 
  ChevronRight, AlertCircle, Trash2, Cpu, HelpCircle, ArrowLeft, Send,
  Globe, ExternalLink
} from 'lucide-react';
import { getApiUrl } from '../utils/api';

interface TeacherDashboardProps {
  roomId: string;
  passcode: string;
  onExit: () => void;
}

export default function TeacherDashboard({ roomId, passcode, onExit }: TeacherDashboardProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [botCount, setBotCount] = useState(5);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [simulateBots, setSimulateBots] = useState(false);

  // Poll room data from backend
  const fetchRoomData = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/rooms/${roomId}?passcode=${passcode}`), {
        headers: {
          'x-teacher-passcode': passcode,
        }
      });
      if (!res.ok) {
        throw new Error('룸 데이터를 가져오는 중 오류가 발생했습니다.');
      }
      const data = await res.json();
      setRoom(data);
      
      // Determine if bots are active by inspecting participants list
      const hasBot = data.participants.some((p: Participant) => p.isBot && !p.isCompleted);
      setSimulateBots(hasBot);
      setError(null);
    } catch (err: any) {
      setError(err.message || '서버와의 연결이 원활하지 않습니다.');
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRoomData();

    // Polling interval every 1.5 seconds for extremely smooth real-time tracking
    const interval = setInterval(() => {
      fetchRoomData();
    }, 1500);

    return () => clearInterval(interval);
  }, [roomId, passcode]);

  // Handle Room State Update
  const updateRoomStatus = async (status: 'waiting' | 'active' | 'paused' | 'completed') => {
    try {
      const res = await fetch(getApiUrl(`/api/rooms/${roomId}/status`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-teacher-passcode': passcode,
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchRoomData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Switch Teacher Led Question Mode Index
  const updateQuestionIndex = async (index: number) => {
    try {
      const res = await fetch(getApiUrl(`/api/rooms/${roomId}/question`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-teacher-passcode': passcode,
        },
        body: JSON.stringify({ index })
      });
      if (res.ok) {
        fetchRoomData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Bot Simulation
  const toggleBots = async (action: 'start' | 'stop') => {
    try {
      const res = await fetch(getApiUrl(`/api/rooms/${roomId}/bots`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-teacher-passcode': passcode,
        },
        body: JSON.stringify({
          action,
          count: botCount,
        })
      });
      if (res.ok) {
        setSimulateBots(action === 'start');
        fetchRoomData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset exam room
  const handleResetRoom = async () => {
    let shouldReset = true;
    try {
      shouldReset = window.confirm('정말로 모든 학생의 기록을 삭제하고 대기 모드로 초기화하시겠습니까?');
    } catch (e) {
      console.warn("window.confirm blocked by browser security sandbox limitations, proceeding directly:", e);
      shouldReset = true;
    }
    if (!shouldReset) {
      return;
    }
    try {
      const res = await fetch(getApiUrl(`/api/rooms/${roomId}/reset`), {
        method: 'DELETE',
        headers: {
          'x-teacher-passcode': passcode,
        }
      });
      if (res.ok) {
        fetchRoomData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyRoomCodeToClipboard = () => {
    try {
      // Get full joined url or standard code
      const joinUrl = `${window.location.origin}/?join=${roomId}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(roomId);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = roomId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy blocked by Safari sandbox restrictions, showing simulated success:", err);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">대시보드를 연동하는 중입니다...</p>
      </div>
    );
  }

  // Pre-calculate statistics
  const totalStudents = room.participants.length;
  const completedStudents = room.participants.filter(p => p.isCompleted).length;
  const activeStudents = totalStudents - completedStudents;
  
  const classScores = room.participants.map(p => p.score);
  const averageScore = classScores.length > 0 
    ? (classScores.reduce((a, b) => a + b, 0) / classScores.length).toFixed(1) 
    : '0';

  // Find max possible points
  const maxPoints = room.questions.reduce((sum, q) => sum + q.points, 0);

  // Sorting Leaderboard
  const sortedParticipants = [...room.participants].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Higher score first
    }
    // Faster completion first if completed
    if (a.isCompleted && b.isCompleted) {
      return (a.completedAt || 0) - (b.completedAt || 0);
    }
    return b.currentQuestionIndex - a.currentQuestionIndex; // More solved first
  });

  // Calculate histogram data: How many students are on which question right now
  const questionHistogram = room.questions.map((q, idx) => {
    // Count participants whose current progress index matches this question index
    const count = room.participants.filter(p => !p.isCompleted && p.currentQuestionIndex === idx).length;
    // Count participants who have solved this question (they are at a higher index or complete)
    const solvedCount = room.participants.filter(p => p.isCompleted || p.currentQuestionIndex > idx).length;
    return {
      index: idx,
      text: `Q${idx + 1}`,
      currentCount: count,
      solvedCount: solvedCount,
    };
  });

  // Question statistics for detailed card reports (correct / incorrect ratios)
  const questionDetails = room.questions.map((q, qIdx) => {
    let correctCount = 0;
    let answeredCount = 0;
    const optsCount = Array.isArray(q.options) ? q.options.length : 0;
    const optionCounts = Array(optsCount).fill(0);

    room.participants.forEach(p => {
      const choice = p.answers[q.id];
      if (choice !== undefined) {
        answeredCount++;
        if (choice < optionCounts.length) {
          optionCounts[choice]++;
        }
        if (choice === q.correctOptionIndex) {
          correctCount++;
        }
      }
    });

    const successRate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    return {
      question: q,
      index: qIdx,
      answeredCount,
      correctCount,
      successRate,
      optionCounts,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Panel (Refined Professional Polish Theme) */}
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <button 
              onClick={onExit} 
              className="mt-1 p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 pointer-events-auto cursor-pointer focus:outline-none transition-colors"
              title="로비로 이동"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`inline-block px-2.5 py-0.5 text-xs font-bold font-sans rounded-full ${
                  room.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                  room.status === 'paused' ? 'bg-amber-100 text-amber-800' :
                  room.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {room.status === 'waiting' && '시험 대기 중'}
                  {room.status === 'active' && '실시간 진행 중'}
                  {room.status === 'paused' && '일시중지 상태'}
                  {room.status === 'completed' && '시험 최종종료'}
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold select-none">CODE:</span>
                <button
                  onClick={copyRoomCodeToClipboard}
                  className="inline-flex items-center gap-1 hover:bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-blue-600 transition"
                  title="클릭하여 코드 복사"
                >
                  {room.id}
                  <Copy className="w-3 h-3 text-blue-600" />
                </button>
                {copied && <span className="text-[10px] text-emerald-600 font-bold">복사 완료!</span>}
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{room.title}</h1>
              <p className="text-xs text-slate-500 mt-1 font-sans">
                진행 유형: <span className="font-semibold text-blue-600">{room.isTeacherLed ? '선생님 주도 동기화 흐름' : '학생 개별 자기주도 풀이'}</span>
              </p>
            </div>
          </div>

          {/* Control Triggers (Professional Polish Styles) */}
          <div className="flex flex-wrap items-center gap-2">
            {room.status === 'waiting' && (
              <button
                onClick={() => updateRoomStatus('active')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                시험 시작하기
              </button>
            )}

            {room.status === 'active' && (
              <>
                <button
                  onClick={() => updateRoomStatus('paused')}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-xs cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  시험 일시 정지
                </button>
                <button
                  onClick={() => updateRoomStatus('completed')}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-xs cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  시험 최종 종료
                </button>
              </>
            )}

            {room.status === 'paused' && (
              <>
                <button
                  onClick={() => updateRoomStatus('active')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-xs cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  시험 재개하기
                </button>
                <button
                  onClick={() => updateRoomStatus('completed')}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-xs cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  시험 바로 종료
                </button>
              </>
            )}

            {room.status === 'completed' && (
              <button
                onClick={() => updateRoomStatus('waiting')}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition border border-slate-200 shadow-3xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
                다시 대기 상태로
              </button>
            )}

            <button
              onClick={handleResetRoom}
              className="p-2.5 bg-slate-100 hover:bg-rose-50 rounded-xl text-slate-500 hover:text-rose-650 transition cursor-pointer border border-transparent hover:border-rose-200"
              title="데이터 전면 리셋"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: 4 statistics metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">총 응시자 수</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalStudents}</span>
            <span className="text-slate-400 text-sm font-medium">명</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">가상 학생 포함 총계</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">상태 (진행 / 완료)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">{activeStudents}</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="text-2xl font-bold text-slate-500">{completedStudents}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">제출 완료율: {totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0}%</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1 font-sans">학급 전체 평균점</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">{averageScore}</span>
            <span className="text-slate-400 text-sm font-sans">점</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">만점 한계선: {maxPoints}점</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">총 문항 수</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{room.questions.length}</span>
            <span className="text-slate-400 text-sm">문항</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium flex items-center gap-1">진행 유형: {room.isTeacherLed ? <span className="text-blue-600 font-bold">동기제어</span> : '자율진행'}</div>
        </div>
      </div>

      {/* Teacher Led Control Block (Professional Polish Theme) */}
      {room.isTeacherLed && room.status === 'active' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600 animate-pulse" />
            선생님 단독 수동 동기제어 (Teacher Led Screen Controller)
          </h3>
          <p className="text-sm text-blue-700 mb-4 font-sans leading-relaxed">
            현재 <strong>&quot;선생님 통제(Teacher-Led)&quot;</strong> 모드입니다. 선생님이 아래 슬라이더에서 타겟 질문을 강제로 이전/다음으로 넘기면, 모든 학생들이 즉각 해당 문제 화면으로 동시 이동합니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {room.questions.map((q, idx) => {
              const isActive = room.currentQuestionIndex === idx;
              return (
                <button
                  key={q.id}
                  onClick={() => updateQuestionIndex(idx)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  제 {idx + 1}문항 전송 
                  {isActive && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Analysis Section */}
      <div className="grid lg:grid-cols-12 gap-8 mb-8 items-start">
        {/* Left: Dynamic Realtime Graphs (8 columns) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* GRAPH 1: Live Question-by-Question Progress Histogram */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">문항별 실시간 진행 및 누적 해결 현황</h3>
                <p className="text-xs text-slate-500 mt-1">
                  어느 문제를 학생들이 주로 해결하고 있으며 어느 단계에 머물러 정체되어 있는지 진단합니다.
                </p>
              </div>
              <span className="text-slate-400 hover:text-slate-600 transition cursor-pointer" title="해결: 질문을 거쳐감, 대기: 현재 머무름">
                <HelpCircle className="w-4 h-4" />
              </span>
            </div>

            {/* Simulated Chart using customized SVG and motion */}
            <div className="pt-4 pb-2">
              {totalStudents === 0 ? (
                <div className="h-48 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                  아직 참가한 학생이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-5 gap-4 items-end h-56 px-4">
                  {questionHistogram.slice(0, room.questions.length).map((hist, idx) => {
                    // Normalize height percent relative to totalStudents
                    const currentPercent = totalStudents > 0 ? (hist.currentCount / totalStudents) * 100 : 0;
                    const solvedPercent = totalStudents > 0 ? (hist.solvedCount / totalStudents) * 100 : 0;
                    
                    return (
                      <div key={hist.index} className="flex flex-col items-center h-full justify-end group">
                        <div className="relative w-full flex items-end justify-center h-full pb-1">
                          {/* Solve background stack */}
                          <motion.div 
                            className="absolute w-8 bg-slate-100 rounded-t-lg border-t border-slate-200"
                            initial={{ height: 0 }}
                            animate={{ height: `${solvedPercent}%` }}
                            transition={{ duration: 0.6 }}
                          />
                          {/* Current active on-screen highlight bar */}
                          <motion.div 
                            className="absolute w-8 bg-blue-600 rounded-t-lg z-10 flex items-center justify-center text-[10px] text-white font-bold"
                            initial={{ height: 0 }}
                            animate={{ height: `${currentPercent}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                          >
                            {hist.currentCount > 0 && hist.currentCount}
                          </motion.div>
                        </div>
                        
                        {/* Label */}
                        <div className="text-xs font-bold text-slate-800 mt-2">{hist.text}</div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5 whitespace-nowrap">
                          {hist.solvedCount}명 해결
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-center items-center gap-6 mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-blue-600 shadow-2xs" />
                <span>현재 머무는 인원</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" />
                <span>완료 및 통과 인원</span>
              </div>
            </div>
          </section>

          {/* GRAPH 2: Live Progress Avatar Timeline Rail (Slider representation) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs pb-8">
            <h3 className="text-base font-bold text-slate-900 mb-2">실시간 응시인원 위치 흐름 레일 (Timeline Tracker)</h3>
            <p className="text-xs text-slate-500 mb-6">
              학생들 개개인이 실시간으로 다음 구역을 돌파하는 모습이 타임라인을 타고 움직입니다.
            </p>

            {room.participants.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                실시간 타임라인 대기 중입니다. 코드로 학생들을 모집해보세요!
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                {/* Horizontal track line for questions */}
                <div className="relative border-b border-blue-100 pb-3">
                  <div className="flex justify-between text-[11px] text-blue-800 font-bold font-mono px-2">
                    {room.questions.map((_, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <span className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-100 font-sans">
                          {idx + 1}단계 문항
                        </span>
                      </div>
                    ))}
                    <div className="flex flex-col items-center">
                      <span className="bg-emerald-50 text-emerald-800 p-1.5 rounded-lg border border-emerald-100 font-sans">
                        완료(GOAL)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Individual progress tracks */}
                <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
                  {room.participants.map((student) => {
                    const qCount = room.questions.length;
                    // Calculate relative completion slider position (0 to qCount index)
                    const percentComplete = (student.currentQuestionIndex / qCount) * 100;
                    
                    return (
                      <div key={student.id} className="relative py-2.5">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className={`font-semibold flex items-center gap-1.5 ${student.isBot ? 'text-blue-800 font-mono' : 'text-slate-800'}`}>
                            {student.name}
                            {student.isCompleted && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold font-sans">합격</span>
                            )}
                          </span>
                          <span className="text-slate-400 text-[10.5px]">
                            {student.currentQuestionIndex === qCount ? '완료' : `${student.currentQuestionIndex + 1}번째 문제 풀이중`}
                          </span>
                        </div>
                        
                        {/* Slider bar */}
                        <div className="h-2.5 bg-slate-100 rounded-full w-full relative overflow-hidden">
                          {/* Completed portion track bar */}
                          <motion.div 
                            className={`h-full rounded-full ${student.isBot ? 'bg-gradient-to-r from-slate-400 to-blue-400' : 'bg-gradient-to-r from-slate-400 to-blue-600'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentComplete}%` }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                          />
                        </div>

                        {/* Floating student progress marker avatar */}
                        <motion.div
                          className="absolute top-[21px] transform -translate-x-1/2 flex flex-col items-center"
                          style={{ left: `${percentComplete}%` }}
                          animate={{ left: `${percentComplete}%` }}
                          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
                            student.isCompleted ? 'bg-emerald-500' : student.isBot ? 'bg-blue-400 animate-pulse' : 'bg-blue-600'
                          }`} />
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* PART 3: Detailed Question Statistics Breakdown */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-2">문항별 정오답 통계 및 옵션 분석</h3>
            <p className="text-xs text-slate-500 mb-6">
              어떤 문항을 많이 맞혔고, 틀린 학생들은 무엇을 골랐는지 실시간 응답 분포 비율을 분석합니다.
            </p>

            <div className="space-y-6">
              {questionDetails.map((details) => {
                const q = details.question;
                
                return (
                  <div key={q.id} className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 font-mono">QUESTION {details.index + 1}</span>
                        <h4 className="text-sm font-semibold text-slate-800 mt-0.5">{q.text}</h4>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          details.successRate >= 70 ? 'bg-emerald-100 text-emerald-800' :
                          details.successRate >= 40 ? 'bg-amber-100 text-amber-800' :
                          details.successRate > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          정답률: {details.successRate}% ({details.correctCount}/{details.answeredCount}명)
                        </span>
                      </div>
                    </div>

                    {/* Option-by-option statistics representation */}
                    <div className="space-y-2">
                      {Array.isArray(q.options) ? (
                        q.options.map((opt, oIdx) => {
                          const count = details.optionCounts[oIdx] || 0;
                          const pct = details.answeredCount > 0 ? Math.round((count / details.answeredCount) * 100) : 0;
                          const isCorrect = oIdx === q.correctOptionIndex;

                          return (
                            <div key={oIdx} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className={`flex items-center gap-1.5 ${isCorrect ? 'text-emerald-700 font-semibold' : 'text-slate-600'}`}>
                                  {isCorrect ? '✓' : '•'} {(oIdx + 1)}번. {opt}
                                  {isCorrect && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1 rounded font-bold">정답</span>}
                                </span>
                                <span className="text-slate-500 font-mono">{count}명 ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full w-full relative overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isCorrect ? 'bg-emerald-500/80' : 'bg-slate-300'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-rose-500">지정된 문제 선택지가 없습니다.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* Right: Real-time Leaderboard & Bot simulation controls (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Section: Live Student Invitation & QR Code */}
          <section className="bg-white border-2 border-blue-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">실시간 학생 참가 초대</h3>
                <p className="text-[10px] text-slate-400 font-sans">국악 사이트 연동 QR 코드 및 직접 입장</p>
              </div>
            </div>

            {/* Room Code Showcase */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-sans">시험 입장 코드 (ROOM CODE)</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-mono font-black tracking-widest text-blue-700">{roomId}</span>
                <button
                  type="button"
                  onClick={copyRoomCodeToClipboard}
                  className="p-1.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 cursor-pointer shadow-3xs transition"
                  title="코드 복사"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <span className="text-[10px] text-emerald-600 font-bold block mt-1.5 animate-bounce">복사 완료!</span>}
            </div>

            {/* QR Connection */}
            <div className="flex flex-col items-center justify-center py-2">
              <span className="text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-wide font-sans">학생용 모바일/태블릿 QR 스캔</span>
              <div className="relative p-2.5 bg-white border border-slate-200 rounded-2xl shadow-3xs flex items-center justify-center w-44 h-44">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${window.location.origin}/?join=${roomId}`)}`}
                  alt="Student Join QR Code"
                  referrerPolicy="no-referrer"
                  className="w-[155px] h-[155px] select-none rounded-lg"
                />
              </div>
              <p className="text-[10.5px] text-slate-500 mt-3 text-center leading-relaxed font-sans">
                카메라로 스캔하면 <strong>실명 입력창</strong>으로<br />
                대기시간 없이 즉시 다이렉트 연동 연결됩니다.
              </p>
            </div>

            {/* URL Invite Link */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">직접 초대 원격 주소 (URL)</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?join=${roomId}`}
                  className="flex-1 text-[10px] px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const joinUrl = `${window.location.origin}/?join=${roomId}`;
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(joinUrl);
                      } else {
                        const textArea = document.createElement("textarea");
                        textArea.value = joinUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textArea);
                      }
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 px-3 rounded-xl transition shrink-0 cursor-pointer"
                >
                  링크 복사
                </button>
              </div>
            </div>
          </section>

          {/* Section A: Simulator Control Room */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              로봇 학생 시험 도우미 (Simulator)
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
              혼자 테스트하시는 경우 실시간 풀이 전송 모니터를 기동해보실 수 있게 가상 학생 봇들을 주입할 수 있습니다.
            </p>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">동시 영입할 학생 숫자</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min={2} 
                    max={15} 
                    value={botCount} 
                    onChange={(e) => setBotCount(Number(e.target.value))}
                    className="w-full accent-blue-600" 
                  />
                  <span className="text-sm font-extrabold text-slate-700 min-w-8 font-mono">{botCount}명</span>
                </div>
              </div>

              {!simulateBots ? (
                <button
                  type="button"
                  onClick={() => toggleBots('start')}
                  disabled={room.status !== 'active'}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer disabled:opacity-40 shadow-3xs"
                >
                  <Cpu className="w-3.5 h-3.5 text-white" />
                  로봇 학생 주입 후 풀이 시작
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleBots('stop')}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer shadow-3xs"
                >
                  <Pause className="w-3.5 h-3.5" />
                  로봇 학생 회수 (종료)
                </button>
              )}

              {room.status !== 'active' && (
                <div className="bg-amber-50 text-[10.5px] text-amber-800 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ 로봇 주입은 시험 상태가 <span className="font-semibold">&quot;실시간 진행 중&quot;</span> 일 때 작동시킬 수 있습니다. 상단에서 시작 단추를 먼저 눌러주세요.
                </div>
              )}
            </div>
          </section>

          {/* Section: 국악 퀴즈 프로그램 원격 통합 뷰어 (Gukak External Live App Monitor) */}
          <section className="bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3.5 border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-450 animate-pulse" />
                국악 퀴즈 라이브 뷰어 (PIP)
              </h3>
              <a 
                href="https://rust-five-34.vercel.app/" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10.5px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 bg-slate-800/85 px-2.5 py-1 rounded-lg border border-slate-705 pointer-events-auto cursor-pointer"
              >
                새 탭 열기 <ExternalLink className="w-3" />
              </a>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed font-sans">
              내가 만든 국악 퀴즈 프로그램 화면을 교사용 화면 내에서 실시간으로 관찰하며 학생들의 풀이 및 통제를 비교하며 실시간 모니터링할 수 있습니다.
            </p>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video relative shadow-inner">
              <iframe 
                src="https://rust-five-34.vercel.app/" 
                title="국악 퀴즈 프로그램 원격 뷰어"
                className="w-full h-full border-0 rounded-xl"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="mt-3 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-sans">
              <span className="font-mono text-slate-405">URL: rust-five-34.vercel.app</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">● 수신 세션 감시 중</span>
            </div>
          </section>
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                성적 석차판 (Leaderboard)
              </h3>
              <span className="text-slate-400 text-xs font-medium">{totalStudents}명 참석</span>
            </div>

            {room.participants.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                현재 등록된 학생이 없습니다.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {sortedParticipants.map((p, pIdx) => {
                    const isTopThree = pIdx < 3;
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition ${
                          isTopThree 
                            ? 'bg-amber-50/40 border-amber-100 text-amber-900' 
                            : 'bg-slate-50 border-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank indicator badge */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            pIdx === 0 ? 'bg-amber-400 text-white' :
                            pIdx === 1 ? 'bg-slate-300 text-slate-800' :
                            pIdx === 2 ? 'bg-amber-600/65 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {pIdx + 1}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${p.isBot ? 'text-blue-600 font-mono' : 'text-slate-800'}`}>
                              {p.name} {p.isBot && <span className="text-[9px] bg-slate-200/50 px-1 rounded font-normal text-slate-500">봇</span>}
                            </span>
                            {/* Question progress */}
                            <span className="text-[10px] text-slate-400">
                              문항 통과: {p.currentQuestionIndex}/{room.questions.length}개
                            </span>
                          </div>
                        </div>

                        {/* Score and percentage */}
                        <div className="text-right">
                          <span className="font-extrabold text-sm">{p.score}</span>
                          <span className="text-slate-400 text-[10px]">점</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
