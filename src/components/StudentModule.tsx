import React, { useEffect, useState } from 'react';
import { Room, Participant, Question, RoomStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, Clock, Award, 
  HelpCircle, ChevronRight, BookOpen, LogOut, ArrowRight, CornerDownRight 
} from 'lucide-react';

interface StudentModuleProps {
  roomId: string;
  participantId: string;
  onExit: () => void;
}

export default function StudentModule({ roomId, participantId, onExit }: StudentModuleProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [student, setStudent] = useState<Participant | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll room data
  const fetchStudentData = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        throw new Error('룸 데이터를 받아오는 중 오류가 발생했습니다.');
      }
      const data = await res.json();
      setRoom(data);

      const me = data.participants?.find((p: any) => p.id === participantId);
      if (!me) {
        throw new Error('이 방에 등록되지 않은 참가자 정보입니다. 로비로 추방되었을 수 있습니다.');
      }
      setStudent(me);
      setError(null);
    } catch (err: any) {
      setError(err.message || '서ver와 통신하는 중 문제가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(() => {
      fetchStudentData();
    }, 1500);

    return () => clearInterval(interval);
  }, [roomId, participantId]);

  // Elapsed Timer Effect
  useEffect(() => {
    if (room?.status !== 'active') return;
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.status]);

  // Handle Option Submission
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOption === null || !room || !student) return;

    // Determine current question
    const currentQIndex = room.isTeacherLed ? room.currentQuestionIndex : student.currentQuestionIndex;
    const q = room.questions[currentQIndex];
    if (!q) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          questionId: q.id,
          selectedOptionIndex: selectedOption
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '답안 전송 도중 실패했습니다.');
      }

      // Success
      setSelectedOption(null);
      await fetchStudentData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!room || !student) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-650 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium font-sans">시험 세션 동기화 준비 중 ...</p>
      </div>
    );
  }

  // Determine current active question structure based on Teacher-Led vs Self-Paced
  const currentQIndex = room.isTeacherLed ? room.currentQuestionIndex : student.currentQuestionIndex;
  const isAllDone = room.status === 'completed' || student.isCompleted;
  const currentQ = room.questions[currentQIndex];

  // Has student answered the CURRENT question?
  const hasAnsweredCurrent = currentQ ? student.answers[currentQ.id] !== undefined : false;
  const studentChoiceIndex = currentQ ? student.answers[currentQ.id] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Mini Profile Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between mb-8 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-300 text-white flex items-center justify-center font-bold text-sm">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono font-bold">STUDENT PARTICIPANT</div>
            <h2 className="text-sm font-bold text-slate-800 font-sans">{student.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5 font-mono">
            <Clock className="w-4 h-4 text-slate-405" />
            {formatTime(elapsedTime)}
          </div>
          <button 
            onClick={onExit} 
            className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-205 px-3 py-1.5 rounded-xl text-slate-700 pointer-events-auto cursor-pointer focus:outline-none transition-all text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            로비로 퇴장
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. ROOM STATE: WAITING */}
      {room.status === 'waiting' && (
        <div className="bg-white border border-slate-205 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-slate-400 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 font-sans">선생님이 시험을 준비 중입니다</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            현재 <span className="font-semibold text-slate-800">&quot;{room.title}&quot;</span> 방에 접속하여 대기하고 있습니다. 선생님이 대시보드에서 시험 개시 단추를 누르면 자동으로 퀴즈가 활성화됩니다.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full animate-pulse border border-blue-100 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            실시간 대기 룸 연동 완료
          </div>
        </div>
      )}

      {/* 2. ROOM STATE: PAUSED */}
      {room.status === 'paused' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-white border border-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-amber-900 mb-2">시험이 일시중지 되었습니다</h3>
          <p className="text-sm text-amber-700 max-w-sm mx-auto mb-4 leading-relaxed font-sans">
            교사에 의해 현재 실시간 시험이 잠시 중단되었습니다. 답안 선택 혹은 전송이 임시 정지되었으니 종료나 재개 시까지 잠시 대기해 주십시오.
          </p>
          <div className="inline-flex items-center gap-1 text-xs text-amber-600 font-bold font-mono">
            WAITING RESUME SNAPSHOT
          </div>
        </div>
      )}

      {/* 3. ACTIVE SOLVING STAGE (WHEN GAME IS ACTIVE & NOT COMPLETED YET) */}
      {room.status === 'active' && !isAllDone && currentQ && (
        <div className="space-y-6">
          
          {/* Question Stats Counter */}
          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold font-sans">
            <span>
              문제 <span className="font-extrabold text-blue-600">{currentQIndex + 1}</span> / {room.questions.length}
            </span>
            <span className="font-extrabold bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg text-blue-750">
              {currentQ.points}점 문항
            </span>
          </div>

          {/* Question Box Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <h3 className="text-lg font-extrabold text-slate-900 mb-6 leading-relaxed font-sans">
              {currentQ.text}
            </h3>

            {/* If Teacher-Led: Show state instruction */}
            {room.isTeacherLed && (
              <div className="mb-4 bg-blue-50 p-2.5 text-xs rounded-xl border border-blue-100 text-blue-800 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
                💡 이 방은 선생님 통제(동시진행) 모드입니다. 여러분은 한 문제를 풀고 동기화를 위해 대기하셔야 합니다.
              </div>
            )}

            <form onSubmit={handleAnswerSubmit} className="space-y-3 font-sans">
              <div className="grid gap-3">
                {Array.isArray(currentQ.options) ? (
                  currentQ.options.map((optionText, oIdx) => {
                    const isChecked = selectedOption === oIdx;
                    const isSubmittedAns = studentChoiceIndex === oIdx;

                    // Disabled options if already answered
                    const disabled = submitting || hasAnsweredCurrent;

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedOption(oIdx)}
                        className={`w-full min-h-11 px-4 py-3 text-left text-sm rounded-xl border flex items-center justify-between transition group pointer-events-auto cursor-pointer ${
                          isChecked 
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold' 
                            : isSubmittedAns
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold shadow-2xs'
                              : 'border-slate-205 bg-slate-50 hover:bg-slate-100 text-slate-800'
                        } ${disabled ? 'opacity-85' : ''}`}
                      >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold ${
                          isChecked 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : isSubmittedAns
                              ? 'bg-emerald-600 border-emerald-600 text-white animate-pulse'
                              : 'bg-white border-slate-300 text-slate-500'
                        }`}>
                          {oIdx + 1}
                        </span>
                        <span>{optionText}</span>
                      </div>
                      
                      {isSubmittedAns && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-rose-500">선택지 데이터를 불러오는 중 오류가 발생했습니다.</div>
              )}
              </div>

              {/* Action buttons */}
              {!hasAnsweredCurrent ? (
                <button
                  type="submit"
                  disabled={selectedOption === null || submitting}
                  className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition duration-150 shadow-sm cursor-pointer disabled:opacity-40"
                >
                  {submitting ? '제출 전송 중...' : '확인 및 정답 제출하기'}
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              ) : (
                <div className="mt-6">
                  {/* If self-paced, can advance. If teacher-led, must wait. */}
                  {!room.isTeacherLed ? (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold">제출 성공! 다음 질문으로 넘어가 실력을 파헤치세요.</span>
                      {/* Advance action handles automatically in api by increment, client polls to sync current index. Wait, we can poll instantly or provide instruction */}
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-1 rounded">
                        자동 동기이동 대기
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block mr-2" />
                      <span className="text-xs font-bold text-slate-600">
                        답안 저장 완료! 선생님이 다음 문제지를 오픈할 때까지 차분히 잠시만 대기해 주세요.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 4. COMPLETED OR WAITING FINISH SCREEN */}
      {isAllDone && (
        <div className="space-y-8 font-sans">
          
          {/* Main Score Board Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xs relative overflow-hidden">
            {/* Background design accents */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-600" />
            
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900 mb-1">시험을 모두 완료했습니다!</h3>
            <p className="text-sm text-slate-400 mb-6 font-sans">
              실시간 문제 해결이 마감되었으며 총 스코어가 등록되었습니다.
            </p>

            {/* Score box layout */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 max-w-sm mx-auto mb-8 grid grid-cols-2 gap-4 divide-x divide-slate-200">
              <div className="text-center">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">최종 획득 점수</span>
                <span className="text-4xl font-black text-blue-600">{student.score}</span>
                <span className="text-slate-400 text-xs font-medium"> / {room.questions.reduce((a, b) => a + b.points, 0)}점</span>
              </div>
              <div className="text-center">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">맞힌 문항 개수</span>
                {/* Count correct questions manually for transparency */}
                <span className="text-4xl font-black text-slate-800">
                  {room.questions.length > 0 ? (
                    room.questions.filter(q => {
                      const studentSelect = student.answers[q.id];
                      // Note: Student's client room might strip correctOptionIndex for security, so server-computed client gets correct ones in detailed reports if teacher lets room complete!
                      // For a completed run, we can look up index if it was returned
                      return studentSelect !== undefined && studentSelect === q.correctOptionIndex;
                    }).length
                  ) : 0}
                </span>
                <span className="text-slate-400 text-xs font-medium"> / {room.questions.length}개</span>
              </div>
            </div>

            {room.status !== 'completed' && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                다른 동료들이 푸는 것을 대시보드에서 선생님이 수집 중입니다.
              </div>
            )}
          </div>

          {/* Educational Review Section (Hidden correct option unless exam complete or completed) */}
          {room.status === 'completed' && room.questions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
              <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-slate-500" />
                출제 정답 해설 및 정오답 분석표
              </h4>
              <p className="text-xs text-slate-500 mb-6 font-medium">
                각 질문을 다시 확인하며 부족했던 영역이 무엇인지 정답 오답 유무를 점검하세요.
              </p>

              <div className="space-y-6">
                {room.questions.map((q, idx) => {
                  const selectIdx = student.answers[q.id];
                  const isCorrect = selectIdx === q.correctOptionIndex;

                  return (
                    <div key={q.id} className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                      isCorrect ? 'bg-emerald-50/20 border-emerald-100/60' : 'bg-rose-50/20 border-rose-100/60'
                    }`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${
                            isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isCorrect ? '정답 완료' : '오답 기록'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">Q{idx + 1}</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-800">{q.text}</h5>
                        
                        <div className="space-y-1 pl-2 border-l-2 border-slate-100 mt-2">
                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                            선택한 보기: <span className="font-semibold text-slate-800">{selectIdx !== undefined ? `${selectIdx + 1}번. ${q.options[selectIdx]}` : '선택하지 않음'}</span>
                          </p>
                          <p className="text-xs text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            실제 정답: <span className="font-semibold text-emerald-900">{(q.correctOptionIndex + 1)}번. {q.options[q.correctOptionIndex]}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono font-bold text-xs shrink-0 pt-1">
                        {isCorrect ? `+${q.points}점` : '0점 / 배점 ' + q.points + '점'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
