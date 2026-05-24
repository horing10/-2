/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import CreateJoinScreen from './components/CreateJoinScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentModule from './components/StudentModule';
import { Question } from './types';
import { HelpCircle, RefreshCw, Sparkles, LogOut } from 'lucide-react';

type ScreenStatus = 'lobby' | 'teacher' | 'student';

export default function App() {
  const [screen, setScreen] = useState<ScreenStatus>('lobby');
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-join if room ID inside link query exists
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    // We will let the Lobby handle it by pre-filling, or just save state
  }, []);

  // API Call: Create a Session Room
  const handleCreateRoom = async (
    title: string,
    questions: Question[],
    isTeacherLed: boolean,
    passcodeText: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          questions,
          isTeacherLed,
          passcode: passcodeText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '시험 방을 생성하지 못했습니다.');
      }

      const rawRoom = await response.json();
      setRoomId(rawRoom.id);
      setPasscode(rawRoom.teacherPasscode);
      setScreen('teacher');
    } catch (err: any) {
      setError(err.message || '네트워크 장애가 지속되고 있습니다.');
    } finally {
      setLoading(false);
    }
  };

  // API Call: Join as a Student
  const handleJoinRoom = async (code: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '접속 시도가 무효 처리되었습니다.');
      }

      const result = await response.json();
      setRoomId(result.room.id);
      setParticipantId(result.participantId);
      setScreen('student');
    } catch (err: any) {
      setError(err.message || '방을 찾을 수 없거나 코드 번호가 잘못되었습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExitToLobby = () => {
    setScreen('lobby');
    setRoomId('');
    setPasscode('');
    setParticipantId('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Header: Global Status aligned with Professional Polish */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl select-none">E</div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900">실시간 평가 모니터링 시스템 (Live Exam Tracker)</h1>
            <p className="text-xs text-slate-500">지능형 문항 지표 추적기 | 상태: 실시간 동기화 중</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            서버 정상 작동 수신 중
          </span>
          <span className="font-mono text-slate-450 text-[10.5px]">API Channel Sync</span>
        </div>
      </header>

      <main className="flex-1 w-full pb-16">
        {screen === 'lobby' && (
          <CreateJoinScreen
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
            loading={loading}
            error={error}
          />
        )}

        {screen === 'teacher' && (
          <TeacherDashboard
            roomId={roomId}
            passcode={passcode}
            onExit={handleExitToLobby}
          />
        )}

        {screen === 'student' && (
          <StudentModule
            roomId={roomId}
            participantId={participantId}
            onExit={handleExitToLobby}
          />
        )}
      </main>

      {/* Footer: System Toast theme */}
      <footer className="h-10 bg-slate-800 text-white flex items-center px-6 justify-between text-xs font-sans mt-auto border-t border-slate-900 select-none">
        <div className="flex gap-4">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            실시간 소켓 대개체 대기 지연 시간: 0.1s 미만
          </span>
          <span className="hidden md:inline opacity-30">|</span>
          <span className="hidden md:inline text-slate-400">데이터 동기 흐름: HTTP Auto-Polling (Smooth Sync)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-slate-700 px-2.5 py-0.5 rounded text-[10.5px] font-mono text-slate-300">
            LOG: ACTIVE
          </span>
        </div>
      </footer>
    </div>
  );
}
