import { PresetQuiz } from './types';

export const presetQuizzes: PresetQuiz[] = [
  {
    id: 'ai-cs-basics',
    title: '정보기술(IT) 및 대규모 언어 모델 상식',
    description: '웹 기술, 알고리즘, 인공지능(AI) 및 LLM 모델의 작동 기초 상식을 테스트합니다.',
    questions: [
      {
        id: 'q1',
        text: '인터넷에서 도메인 이름(예: google.com)을 숫자로 된 IP 주소로 변환해주는 시스템의 명칭은 무엇인가요?',
        options: ['HTTP', 'DNS', 'DHCP', 'FTP'],
        correctOptionIndex: 1,
        points: 20,
      },
      {
        id: 'q2',
        text: '대규모 언어 모델(LLM)이 그럴듯하지만 완전히 왜곡되거나 허구인 사실을 마치 진짜처럼 자신 있게 답변하는 인공지능 오류 메커니즘을 무엇이라 부르나요?',
        options: ['착각/환각 (Hallucination)', '무한 훈련 (Infinite Loop)', '과적합 (Overfitting)', '데이터 편향 (Data Bias)'],
        correctOptionIndex: 0,
        points: 20,
      },
      {
        id: 'q3',
        text: '웹 소통에 쓰이는 암호화 프로토콜인 HTTPS에서 복원력 있는 보안 전송과 신원 인증을 보장하기 위해 기본으로 사용하는 표준 암호화 방식은?',
        options: ['SSL/TLS', 'AES-128 Solo', 'Base64 Direct', 'MD5 Direct Hash'],
        correctOptionIndex: 0,
        points: 20,
      },
      {
        id: 'q4',
        text: '브라우저 렌더링 엔진이 HTML 문서를 계층 구조의 트리 형식으로 표현하며 동적 조작이 가능하도록 만드는 API 객체 구조 체계는?',
        options: ['CSSOM', 'DOM', 'JSON', 'Local Storage'],
        correctOptionIndex: 1,
        points: 20,
      },
      {
        id: 'q5',
        text: '인공지능 딥러닝에서 입력 문장 내 모든 단어 간의 상관관계를 한 번에 파악하여 문맥을 이해할 수 있게 한 혁신적인 신경망 아키텍처는?',
        options: ['CNN (합성곱 신경망)', 'RNN (순환 신경망)', 'Transformer (트랜스포머)', 'LTSM'],
        correctOptionIndex: 2,
        points: 20,
      },
    ],
  },
  {
    id: 'science-general',
    title: '과학 및 서바이벌 상식 퀴즈',
    description: '기초 물리, 천문학 및 일상 속 과학적 흥미를 자극하는 서바이벌 지식 테스트입니다.',
    questions: [
      {
        id: 's1',
        text: '태양계 행성 중 가장 지름이 크며 가스층으로 덮여 있는 행성이자 거대 붉은 점(대적점)을 가진 곳은 어디입니까?',
        options: ['토성', '목성', '해왕성', '화성'],
        correctOptionIndex: 1,
        points: 25,
      },
      {
        id: 's2',
        text: '물리학에서 빛의 속도는 약 얼마로 계산되며, 작용하는 질량이 빛의 구속 한계를 완전히 벗어나 탈출할 수 없는 천체는 무엇입니까?',
        options: ['30만 km/s - 블랙홀', '15만 km/s - 왜성', '45만 km/s - 중성자별', '10만 km/s - 혜성'],
        correctOptionIndex: 0,
        points: 25,
      },
      {
        id: 's3',
        text: '비행기가 공중으로 떠오르기 위해 날개 상하부의 공기 흐름 속도 차이에 의한 기압차로 발생하는 아래에서 위로 밀어 올리는 양 힘은?',
        options: ['중력', '마찰력', '양력', '추진력'],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: 's4',
        text: '순수한 상태의 물(H2O)은 섭씨 기준 몇 도에서 가장 높은 부피당 밀도(가장 무거운 상태)가 나타날까요?',
        options: ['섭씨 0도', '섭씨 4도', '섭씨 10도', '섭씨 -4도'],
        correctOptionIndex: 1,
        points: 25,
      },
    ],
  },
  {
    id: 'world-trivia',
    title: '세계 지리 및 문화 상식',
    description: '세계의 이색적이고 흥미로운 문화와 흥미진진한 지리 상식에 대해 알아봅니다.',
    questions: [
      {
        id: 'w1',
        text: '전 세계에서 영토 면적이 가장 크고 아시아와 유럽 대륙에 동시에 걸쳐 있는 국가는 어디일까요?',
        options: ['캐나다', '중국', '미국', '러시아'],
        correctOptionIndex: 3,
        points: 25,
      },
      {
        id: 'w2',
        text: '고대 그리스인들이 예술과 지적 창작을 관장하는 신성한 성역으로 숭배했으며 예술가에게 영감을 주는 존재의 명칭은?',
        options: ['아폴론', '뮤즈 (Muse)', '아프로디테', '세이렌'],
        correctOptionIndex: 1,
        points: 25,
      },
      {
        id: 'w3',
        text: '아프리카 대륙의 최고봉이자 년중 내내 하얗게 빛나는 만년설을 머리에 이고 있는 휴화산 탄자니아 거봉의 이름은?',
        options: ['에베레스트', '후지산', '킬리만자로', '몽블랑'],
        correctOptionIndex: 2,
        points: 25,
      },
      {
        id: 'w4',
        text: '남아메리카 브라질 옆 바다와 고산지대를 굽이쳐 흐르는 지상에서 가장 방대한 유량을 자랑하는 문명의 젖줄은?',
        options: ['나일강', '아마존강', '미시시피강', '갠지스강'],
        correctOptionIndex: 1,
        points: 25,
      },
    ],
  },
];
