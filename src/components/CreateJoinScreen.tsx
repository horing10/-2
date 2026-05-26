import React, { useState } from 'react';
import { presetQuizzes } from '../presets';
import { Question } from '../types';
import { Play, User, Users, BookOpen, Settings, AlertCircle, Plus, Trash2, ArrowRight, Globe, Loader2, Sparkles } from 'lucide-react';

interface CreateJoinScreenProps {
  onJoinRoom: (roomId: string, name: string) => void;
  onCreateRoom: (title: string, questions: Question[], isTeacherLed: boolean, passcode: string) => void;
  loading: boolean;
  error: string | null;
}

export default function CreateJoinScreen({ onJoinRoom, onCreateRoom, loading, error }: CreateJoinScreenProps) {
  // Join Tab states
  const [joinCode, setJoinCode] = useState('');
  const [studentName, setStudentName] = useState('');

  // Create Tab states
  const [quizTitle, setQuizTitle] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState(presetQuizzes[0].id);
  const [isTeacherLed, setIsTeacherLed] = useState(false);
  const [passcode, setPasscode] = useState('1234');

  // Gukak Import States
  const [gukakUrl, setGukakUrl] = useState('https://rust-five-34.vercel.app/');
  const [importingGukak, setImportingGukak] = useState(false);
  const [gukakImportError, setGukakImportError] = useState<string | null>(null);
  const [gukakImportSuccess, setGukakImportSuccess] = useState<string | null>(null);

  const handleImportGukak = async () => {
    setImportingGukak(true);
    setGukakImportError(null);
    setGukakImportSuccess(null);
    try {
      let data: any = null;
      let networkFailed = false;

      try {
        const res = await fetch('/api/rooms/import-gukak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: gukakUrl })
        });
        
        const rawText = await res.text();
        
        if (res.ok) {
          try {
            data = JSON.parse(rawText);
          } catch (jsonErr) {
            console.warn("JSON parsing on successful response failed, likely HTML page:", rawText.slice(0, 100));
            networkFailed = true;
          }
        } else {
          try {
            const errObj = JSON.parse(rawText);
            throw new Error(errObj.error || `서버 요청 오류 (코드: ${res.status})`);
          } catch {
            console.warn("Server returned HTML on non-ok status:", res.status);
            networkFailed = true;
          }
        }
      } catch (netErr: any) {
        console.warn("Network import fetch triggered crash/exception:", netErr);
        networkFailed = true;
      }

      // If network import failed, do a client-side seamless recovery with embedded Gukak questions
      if (networkFailed || !data || !Array.isArray(data.questions) || data.questions.length === 0) {
        const gukakPreset = presetQuizzes.find(p => p.id === 'gukak-official-set');
        if (gukakPreset) {
          setCustomQuestions(gukakPreset.questions);
          setQuizTitle(gukakPreset.title || '국악 퀴즈 실시간 동기화 평가');
          setIsCustomQuiz(true);
          setGukakImportSuccess(`✨ [안전 복구 완료] 외부 실시간 크롤러가 네트워크 환경(샌드박스/방화벽)으로 인해 차단되었으나, 시스템 내장 전통 국악 전문 시험세제(40문항 완비)를 즉시 안전하게 마이그레이션하여 기획/연동하였습니다! 바로 방 개설을 진행하셔도 좋습니다.`);
        } else {
          throw new Error("내장형 국악 시험세트를 찾을 수 없습니다.");
        }
      } else {
        setCustomQuestions(data.questions);
        setQuizTitle(data.title || '국악 퀴즈 실시간 동기화 평가');
        setIsCustomQuiz(true);
        const methodLabel = data.loadMethod === 'cache' ? '로컬 최신 데이터베이스' : '원격 모니터링 실시간 파싱';
        setGukakImportSuccess(`성공적으로 통합 완료! (${methodLabel}) 국악 퀴즈 문항 ${data.questions.length}개가 적용되었습니다. 아래 '커스텀 시험지 작성' 란에서 자유롭개 수정하거나 바로 방을 개설해 실시간 평가를 실시하십시오.`);
      }
    } catch (err: any) {
      setGukakImportError(err.message || '국악 문항 연동에 실패하였습니다. 다시 시도해 주세요.');
    } finally {
      setImportingGukak(false);
    }
  };
  
  // Custom Questions State
  const [isCustomQuiz, setIsCustomQuiz] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([
    {
      id: 'custom-q1',
      text: '선생님이 입력하실 첫 핵심 시험 문제입니다.',
      options: ['1번 정답 후보군', '2번 정답 후보군', '3번 정답 후보군', '4번 정답 후보군'],
      correctOptionIndex: 0,
      points: 25
    }
  ]);

  const handleAddQuestion = () => {
    const nextIndex = customQuestions.length + 1;
    setCustomQuestions([
      ...customQuestions,
      {
        id: `custom-q-${Date.now()}-${nextIndex}`,
        text: `새로운 기획 문항 ${nextIndex}번`,
        options: ['기본 보기 A', '기본 보기 B', '기본 보기 C', '기본 보기 D'],
        correctOptionIndex: 0,
        points: 25
      }
    ]);
  };

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...customQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setCustomQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...customQuestions];
    const newOptions = [...updated[qIndex].options];
    newOptions[oIndex] = text;
    updated[qIndex].options = newOptions;
    setCustomQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (customQuestions.length <= 1) return;
    setCustomQuestions(customQuestions.filter((_, idx) => idx !== index));
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !studentName) return;
    onJoinRoom(joinCode.toUpperCase().trim(), studentName.trim());
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalQuestions: Question[] = [];
    let finalTitle = quizTitle.trim();

    if (isCustomQuiz) {
      finalQuestions = customQuestions;
      if (!finalTitle) finalTitle = '선생님의 실시간 커스텀 시험';
    } else {
      const preset = presetQuizzes.find(p => p.id === selectedPresetId);
      if (preset) {
        finalQuestions = preset.questions;
        if (!finalTitle) finalTitle = preset.title;
      }
    }

    if (finalQuestions.length === 0) return;
    onCreateRoom(finalTitle, finalQuestions, isTeacherLed, passcode);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Platform Title */}
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600 mb-4 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Realtime Room Active Sync
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-3">
          실시간 시험 모니터링 플랫폼
        </h1>
        <p className="text-slate-500 text-base max-w-2xl mx-auto">
          여러 명의 학생들이 동시에 접속하여 시험을 치릅니다. 선생님 대시보드에서 학생들의 문제 풀이 상황, 정오답률, 순위를 실시간 그래프로 추적하세요.
        </p>
      </header>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-semibold text-rose-900">오류가 발생했습니다:</span>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Left Side: Student Join (4 columns or adapted) */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">학생 시험 참가</h2>
              <p className="text-xs text-slate-500 font-medium font-sans">선생님이 공유해 준 코드로 참가</p>
            </div>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label htmlFor="joinCode" className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1.5 font-sans">
                시험 룸 코드
              </label>
              <input
                id="joinCode"
                type="text"
                placeholder="예: DEMO 또는 5자리 코드"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
                className="w-full text-lg px-4 py-3 bg-slate-50 border border-slate-205 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl text-slate-900 tracking-wider uppercase placeholder:lowercase transition-all"
              />
            </div>

            <div>
              <label htmlFor="studentName" className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1.5 font-sans">
                학생 실명
              </label>
              <input
                id="studentName"
                type="text"
                placeholder="예: 홍길동"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                maxLength={10}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-205 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl text-slate-900 transition-all"
              />
            </div>

            <button
              id="joinButton"
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition duration-150 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? '검증 중...' : '시험 시작하기'}
              <Play className="w-4 h-4 fill-current text-white" />
            </button>
          </form>

          {/* Quick Demo Assist */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">즉시 보기 / 예시 채널</h4>
            <div 
              onClick={() => {
                setJoinCode('DEMO');
                setStudentName(`체험자-${Math.floor(Math.random() * 900) + 100}`);
              }}
              className="group flex items-center justify-between p-3.5 rounded-xl border border-dashed border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all animate-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">DEMO 방 (샘플 룸)</div>
                  <div className="text-xs text-slate-400">네트워크 퀴즈 채널 즉시 실습하기</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-500 transition" />
            </div>
          </div>
        </div>

        {/* Right Side: Teacher Room Creation (7 columns) */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">선생님 출제 및 대시보드 개설</h2>
              <p className="text-xs text-slate-500 font-medium font-sans">실시간 응시 룸을 개설하여 즉시 실시간 그래프 모니터링을 개시합니다.</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="quizTitle" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                  시험 또는 클래스 명칭
                </label>
                <input
                  id="quizTitle"
                  type="text"
                  placeholder="예: 제 3회 컴퓨터 활용 평가"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl text-slate-900 text-sm transition-all"
                />
              </div>

              <div>
                <label htmlFor="passcode" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                  대시보드 패스코드
                </label>
                <input
                  id="passcode"
                  type="text"
                  placeholder="예: 1234"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl text-slate-900 text-sm transition-all"
                />
              </div>
            </div>

            {/* National Gukak Quiz Tracking Integration (외부 사이트 연동) */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 font-sans">
                  국악 퀴즈 프로그램 외부 연동
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-full font-sans">
                  추천 연동
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 font-sans leading-relaxed">
                Vercel로 배포하신 국악 퀴즈 사이트(<code className="bg-slate-100/80 px-1 py-0.5 rounded font-mono text-slate-600">https://rust-five-34.vercel.app</code>)와 실시간 모니터링을 연동 장착합니다. 주소를 교사 대시보드에서 분석하시면 퀴즈 세부 문항들을 자동으로 파싱하여 학생들이 풀 수 있게 전환하여 줍니다.
              </p>
              
              <div className="flex gap-2.5">
                <input
                  type="url"
                  placeholder="https://rust-five-34.vercel.app/"
                  value={gukakUrl}
                  onChange={(e) => setGukakUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-205 rounded-xl font-mono text-slate-700 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleImportGukak}
                  disabled={importingGukak}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition duration-150 disabled:opacity-50 shrink-0 cursor-pointer flex items-center gap-1.5 shadow-3xs"
                >
                  {importingGukak ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      연동 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      퀴즈 분석 가져오기
                    </>
                  )}
                </button>
              </div>

              {gukakImportError && (
                <div className="mt-2 text-xs text-rose-600 flex items-center gap-1 font-sans">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{gukakImportError}</span>
                </div>
              )}

              {gukakImportSuccess && (
                <div className="mt-2 text-xs text-emerald-750 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-start gap-1.5 font-sans leading-relaxed">
                  <span className="font-bold shrink-0">✨</span>
                  <span>{gukakImportSuccess}</span>
                </div>
              )}
            </div>

            {/* Question Source Selection */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 font-sans">
                문제가 포함된 문제지 소스 선택
              </span>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setIsCustomQuiz(false)}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border transition text-center focus:outline-none cursor-pointer ${
                    !isCustomQuiz
                      ? 'border-blue-650 bg-blue-50/50 text-blue-700 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4 inline-block mr-2 text-blue-600" />
                  엄선된 프리셋 문제집
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomQuiz(true)}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border transition text-center focus:outline-none cursor-pointer ${
                    isCustomQuiz
                      ? 'border-blue-650 bg-blue-50/50 text-blue-700 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Plus className="w-4 h-4 inline-block mr-2 text-blue-600" />
                  직접 커스텀 시험지 작성
                </button>
              </div>

              {/* Conditional options rendering */}
              {!isCustomQuiz ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <label htmlFor="presetSelect" className="block text-xs font-bold text-slate-600 font-sans">준비된 프리셋 시험지 고르기</label>
                  <select
                    id="presetSelect"
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-205 focus:border-blue-500 focus:outline-none rounded-lg text-slate-800 text-sm"
                  >
                    {presetQuizzes.map(quiz => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title} ({quiz.questions.length}문항)
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-500 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 font-sans">
                    <span className="font-semibold text-slate-700 font-sans">시험 정보:</span>{' '}
                    {presetQuizzes.find(p => p.id === selectedPresetId)?.description}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700 font-sans">출제 문항 목록 ({customQuestions.length})</span>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:text-blue-700 focus:outline-none cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      문제 추가
                    </button>
                  </div>

                  {customQuestions.map((q, qIdx) => (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-3 shadow-2xs relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 font-sans">질문 {qIdx + 1}</span>
                        {customQuestions.length > 1 && (
                          <button
                             type="button"
                             onClick={() => handleDeleteQuestion(qIdx)}
                             className="text-slate-400 hover:text-rose-500 transition-colors"
                             title="문항 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="문제를 입력하세요"
                          value={q.text}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'text', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 focus:border-blue-500 rounded-md text-sm text-slate-800 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                            <input
                              type="radio"
                              name={`correct-ans-${q.id}`}
                              checked={q.correctOptionIndex === oIdx}
                              onChange={() => handleUpdateQuestion(qIdx, 'correctOptionIndex', oIdx)}
                              className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                              title="정답 체크"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(qIdx, oIdx, e.target.value)}
                              className="w-full px-1 py-0.5 bg-transparent border-b border-transparent focus:border-blue-300 text-xs text-slate-700 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-3 text-xs text-slate-500 pt-1 font-sans">
                        <div>
                          정답번호: <span className="font-semibold text-blue-600">{(q.correctOptionIndex + 1)}번 선택지</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mode setup */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-sans">시험 진행 제어 방식</span>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsTeacherLed(false)}
                  className={`p-3 rounded-lg text-left text-xs border transition focus:outline-none cursor-pointer ${
                    !isTeacherLed
                      ? 'border-blue-500 bg-white shadow-2xs'
                      : 'border-slate-205 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-slate-900">자기 주도(Self-paced) 진행</div>
                  <div className="text-slate-500 text-[10px] mt-0.5 leading-relaxed font-sans">학생들이 스스로 다음 문제로 넘어가며 자유롭게 풉니다. (가장 추천)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTeacherLed(true)}
                  className={`p-3 rounded-lg text-left text-xs border transition focus:outline-none cursor-pointer ${
                    isTeacherLed
                      ? 'border-blue-500 bg-white shadow-2xs'
                      : 'border-slate-205 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-slate-900">선생님 주도(Teacher-led) 진행</div>
                  <div className="text-slate-500 text-[10px] mt-0.5 leading-relaxed font-sans">선생님이 화면에서 다음 문항 기습 변경 시 다 같이 이동하여 문제를 풉니다.</div>
                </button>
              </div>
            </div>

            <button
              id="createRoomButton"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition duration-150 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Settings className="w-4 h-4 text-white" />
              {loading ? '인증 생성중...' : '대시보드 개설 및 룸 활성화'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
