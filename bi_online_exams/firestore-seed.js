// Firestore 테스트 데이터 시더
// Firebase 콘솔 > Firestore > 데이터에서 직접 아래 구조로 문서를 추가하세요.

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컬렉션: exams / 문서 ID: exam_001
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const examDoc = {
  title: "RF 임피던스 매칭 기초 평가",
  titleEn: "RF Impedance Matching Basics",
  durationMin: 30,
  questionIds: ["q001", "q002", "q003", "q004", "q005"],
  createdAt: new Date()
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컬렉션: questions / 문서들
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const questions = [
  {
    id: "q001",
    type: "mcq",
    body: "VSWR이 1일 때의 의미는?",
    choices: ["완전 반사 (Complete Reflection)", "완전 정합 (Perfect Match)", "임피던스 불일치", "정재파 없음"],
    answerIdx: 1  // 0-based index (B = 완전 정합)
  },
  {
    id: "q002",
    type: "mcq",
    body: "반도체 RF 공정에서 가장 많이 사용되는 주파수는?",
    choices: ["1 MHz", "13.56 MHz", "100 MHz", "2.45 GHz"],
    answerIdx: 1
  },
  {
    id: "q003",
    type: "mcq",
    body: "Smith Chart에서 원점(center)이 나타내는 임피던스는?",
    choices: ["0 Ω (단락)", "∞ Ω (개방)", "50 Ω (특성 임피던스)", "100 Ω"],
    answerIdx: 2
  },
  {
    id: "q004",
    type: "short",
    body: "RF Matcher의 역할을 간단히 설명하시오.",
    // 단답형은 answerIdx 없음 — 관리자가 수동 채점
  },
  {
    id: "q005",
    type: "mcq",
    body: "전압 정재파비(VSWR) 계산 공식은?",
    choices: [
      "VSWR = (1 + |Γ|) / (1 - |Γ|)",
      "VSWR = |Γ|² × Z₀",
      "VSWR = ZL / Z₀",
      "VSWR = (ZL - Z₀) / (ZL + Z₀)"
    ],
    answerIdx: 0
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컬렉션: activeSession / 문서 ID: current
// 시험 시작 시 이 문서를 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const activeSessionDoc = {
  status: "waiting",   // "waiting" | "running" | "ended"
  examId: "exam_001",
  startedAt: null
};

// status를 "running"으로 바꾸면 → 수강생 화면이 자동으로 시험 시작
// activeSession > current > status = "running"

console.log("시더 데이터 준비 완료");
console.log("exams/exam_001:", JSON.stringify(examDoc, null, 2));
console.log("questions:", questions.length, "개");
console.log("activeSession/current:", JSON.stringify(activeSessionDoc, null, 2));
