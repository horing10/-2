import fetch from 'node-fetch';
import fs from 'fs';

async function updateDefaultQuestions() {
  const url = 'https://rust-five-34.vercel.app/assets/index-BVj4vPuK.js';
  try {
    const res = await fetch(url);
    const jsText = await res.text();
    
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
        const parsed = new Function(`return ${arrayStr}`)();
        if (Array.isArray(parsed) && parsed.length > 0) {
          const questions = parsed.map((q: any) => {
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
          
          fs.writeFileSync('gukak_questions_default.json', JSON.stringify(questions, null, 2), 'utf-8');
          console.log(`Successfully updated /gukak_questions_default.json with ${questions.length} new questions!`);
        }
      }
    }
  } catch (err: any) {
    console.error('Failed to update questions:', err.message);
  }
}

updateDefaultQuestions();
