import type { ApprovalResult, EventPlanResult, EventReportResult, ObservationResult, ParentNoticeResult, ReceiptExtractionResult } from "@/lib/schemas";

export const demoObservationResult: ObservationResult = {
  title: "가을 택배소 놀이 기록",
  objectiveRecord: "유아 A가 도토리 6개를 종이봉투에 넣고 ‘택배로 보내요.’라고 말했다. 유아 B가 ‘우표 없으면 못 가.’라고 말한 뒤 주변의 나뭇잎을 가져와 봉투에 붙였다. 봉투가 찢어지자 두 유아가 테이프를 찾아 함께 붙였다. 교사가 어디로 보내는지 묻자 유아 A가 ‘달로 보내요.’라고 답했다.",
  parentStory: "교실에 가을 택배소가 열렸습니다. 아이들은 도토리를 봉투에 담고 나뭇잎을 우표로 삼아 달까지 보내는 상상을 이어 갔습니다. 봉투가 찢어졌을 때는 테이프를 찾아 붙이며 놀이에 필요한 방법을 스스로 시도했습니다.",
  playSupport: {
    environment: ["봉투를 쓰고 포장할 수 있는 택배 작업 공간", "보낸 곳과 받는 곳을 표시할 수 있는 지도 공간"],
    materials: ["여러 크기의 종이봉투", "스티커와 도장", "가을 자연물", "안전한 종이테이프"],
    openQuestions: ["이 택배는 어디로 가면 좋을까?", "멀리 보내려면 무엇이 더 필요할까?", "봉투가 찢어지지 않게 하려면 어떻게 할 수 있을까?"],
    safetyPoints: ["작은 자연물을 입이나 코에 넣지 않는지 살펴보기", "테이프 커터는 교사가 관리하기"],
    nextObservationPoints: ["주소와 표식이 놀이에서 어떻게 사용되는지", "문제가 생겼을 때 어떤 해결 방법을 시도하는지"],
  },
  reviewFlags: [{ category: "해석 주의", text: "협동성이 높다", reason: "한 번의 공동 행동만으로 성향 수준을 단정하기 어렵습니다.", suggestion: "친구와 함께 테이프를 사용해 찢어진 봉투를 붙였다." }],
  missingInformation: ["관찰 날짜와 장소가 있으면 기록 맥락이 더 분명해집니다."],
  guidelineReferences: [],
};

export const demoEventPlanResult: EventPlanResult = {
  documentTitle: "가을 전통놀이 한마당 행사 계획서",
  overview: {
    eventName: "가을 전통놀이 한마당",
    eventType: "전통놀이 행사",
    purpose: "유아가 여러 전통놀이를 자유롭게 반복해 경험하도록 한다.",
    target: "만 3~5세 유아",
    dateTime: "추가 정보 필요",
    place: "유치원 강당과 바깥놀이터",
    expectedParticipants: "추가 정보 필요",
    personInCharge: "담당자 확인 필요",
    operationMethod: "연령별 순환 운영, 경쟁보다 자유로운 반복 참여 중심",
  },
  objectives: ["다양한 전통놀이 방법을 탐색한다.", "친구와 공간과 도구를 나누어 사용하며 놀이를 이어 간다."],
  preparationSchedule: [
    { timing: "행사 2주 전", task: "세부 프로그램과 공간 확정", personInCharge: "담당자 확인 필요", status: "확인 필요" },
    { timing: "행사 1주 전", task: "준비물과 대체 공간 점검", personInCharge: "담당자 확인 필요", status: "미완료" },
    { timing: "행사 전날", task: "공간 배치와 안전 점검", personInCharge: "담당자 확인 필요", status: "미완료" },
  ],
  program: [
    { time: "전체 운영 시간 확정 후 입력", activity: "제기차기", details: "개별 또는 소그룹으로 반복해 시도한다.", personInCharge: "담당자 확인 필요", safetyCheck: "활동 간 간격 확보" },
    { time: "전체 운영 시간 확정 후 입력", activity: "투호", details: "연령에 맞게 거리를 조절해 참여한다.", personInCharge: "담당자 확인 필요", safetyCheck: "던지는 방향과 대기선 구분" },
  ],
  roles: [
    { role: "총괄", responsibility: "전체 운영과 변경 사항 조정", personInCharge: "담당자 확인 필요" },
    { role: "안전 점검", responsibility: "공간과 이동 동선 확인", personInCharge: "담당자 확인 필요" },
    { role: "사진·기록", responsibility: "기관 방침에 따라 운영 장면 기록", personInCharge: "담당자 확인 필요" },
  ],
  materials: {
    available: ["기관 보유 전통놀이 도구 확인"],
    toPrepare: ["활동 구역 표지", "연령별 거리 표시"],
    consumables: ["테이프", "이름 없는 참여 스티커"],
    safety: ["구급함 위치 확인", "미끄럼 방지 매트"],
    documentation: ["참여 인원 확인표", "안전 점검표"],
  },
  safetyPlan: [{ risk: "활동 구역 간 충돌", prevention: "동선과 대기선을 분리하고 참여 인원을 조절한다.", response: "기관 안전 절차에 따라 활동을 중지하고 담당자에게 알린다.", personInCharge: "담당자 확인 필요" }],
  parentCommunicationPoints: ["행사 목적", "확정된 일시와 장소", "편안한 복장", "우천 시 운영 방식", "사진 촬영 안내"],
  budgetItems: [],
  confirmationChecklist: ["행사 날짜와 시간을 확인했는가?", "담당자와 협조 인력을 확정했는가?", "예산 과목과 금액을 확인했는가?", "기관 안전 지침과 대조했는가?"],
  reviewFlags: [{ field: "담당자", reason: "담당자 정보가 입력되지 않았습니다.", requiredAction: "역할별 담당자를 기관에서 확정해 주세요." }],
  guidelineReferences: [],
};

export const demoEventReportResult: EventReportResult = {
  documentTitle: "가을 전통놀이 한마당 결과 보고서",
  overview: {
    eventName: "가을 전통놀이 한마당",
    dateTime: "2026-09-18 10:00~11:40",
    place: "유치원 강당",
    target: "만 3~5세 유아",
    participants: "유아 57명, 교직원 8명",
    personInCharge: "담당자 확인 필요",
  },
  implementationSummary: "우천으로 실외 활동을 실내 순환 방식으로 변경해 제기차기, 투호, 비석치기를 운영했다. 실제 운영 시간과 참여 인원은 추가 확인이 필요하다.",
  activities: [
    { activity: "전통놀이 순환 활동", details: "강당에서 제기차기, 투호, 비석치기를 연령별로 순환 운영했다." },
    { activity: "교실 연계", details: "관심이 이어진 투호 도구를 교실 놀이 영역에 제공하기로 했다." },
  ],
  childResponses: [{ observedFact: "일부 유아가 투호 활동에 다시 참여했다.", possibleMeaning: "해당 활동에 관심을 보였을 가능성이 있으나 추가 관찰이 필요하다.", confirmationRequired: true }],
  safetyAndIncidents: ["입력된 안전사고 정보 없음", "기관 기록과 추가 대조 필요"],
  strengths: [{ point: "우천 상황에 맞게 실내 순환 방식으로 전환", evidence: "실제 장소를 강당으로 변경하고 활동 수를 조정함" }],
  issuesAndImprovements: [{ area: "공간", issue: "실내 활동 간 소음과 대기 공간이 겹침", improvement: "다음 행사에서는 대기 구역과 이동 방향을 표지로 구분한다." }],
  followUpActions: ["교실 놀이 영역에 투호 도구를 일정 기간 제공", "다음 행사 계획에 우천 전환 동선 포함"],
  attachmentChecklist: ["행사 사진", "참여 인원 확인자료", "예산 증빙자료", "안전 점검 자료"],
  reviewFlags: [{ field: "실제 참여 인원", reason: "구체적인 인원이 입력되지 않았습니다.", requiredAction: "참여 인원 확인자료와 대조해 입력해 주세요." }],
  guidelineReferences: [],
};

export const demoApprovalResult: ApprovalResult = {
  documentTitle: "전통놀이 행사 준비물 구매 품의서 초안",
  purpose: "유아 전통놀이 행사 운영에 필요한 소모품을 사전에 준비하고자 합니다.",
  purchaseSummary: "활동 구역 표시용 테이프와 꾸미기 재료를 구매할 예정입니다. 단가와 예산 과목은 결재 전 확인이 필요합니다.",
  suggestedItems: [
    { item: "활동 구역 표시 테이프", quantity: 5, unitPrice: 3000, budgetCategory: "", vendor: "", note: "행사 동선 표시", confirmationRequired: true },
    { item: "꾸미기 재료", quantity: null, unitPrice: null, budgetCategory: "", vendor: "", note: "수량과 단가 확인 필요", confirmationRequired: true },
  ],
  expectedEffects: ["행사 활동 구역과 이동 동선을 분명하게 표시할 수 있습니다."],
  confirmationChecklist: ["예산 과목 확인", "수량과 단가 확인", "구매처 확인", "기관 결재 양식 대조"],
  reviewFlags: [{ field: "예산 과목", reason: "입력된 예산 과목이 없습니다.", requiredAction: "기관 예산 담당자와 과목을 확인해 주세요." }],
  guidelineReferences: [],
};

export const demoReceiptExtractionResult: ReceiptExtractionResult = {
  receipts: [{
    sourceIndex: 1,
    merchant: "누리문구",
    purchaseDate: "2026-09-17",
    items: [
      { description: "표시 테이프", quantity: 5, unitPrice: 3000, printedAmount: 15000, confidence: "high", needsReview: false },
    ],
    printedTotal: 15000,
    warnings: [],
  }],
  reviewFlags: [],
};

export const demoParentNoticeResult: ParentNoticeResult = {
  title: "가을 전통놀이 한마당 안내",
  greeting: "안녕하세요. 유아들이 다양한 전통놀이를 경험할 수 있도록 가을 전통놀이 한마당을 준비하고 있습니다.",
  body: ["경쟁보다 자유롭게 반복해서 참여하며 놀이 방법을 탐색하는 시간을 갖습니다.", "확정된 일정과 장소는 아래 내용을 확인해 주세요."],
  keyDetails: [{ label: "일시", value: "추가 정보 필요" }, { label: "장소", value: "유치원 강당과 바깥놀이터" }],
  requests: ["편안한 복장을 확인해 주세요.", "사진 촬영 안내와 우천 운영 방식을 확인해 주세요."],
  closing: "유아들이 안전하게 놀이를 경험할 수 있도록 준비하겠습니다. 감사합니다.",
  reviewFlags: [{ field: "행사 일시", reason: "확정된 정보가 없습니다.", requiredAction: "발송 전에 날짜와 시간을 입력해 주세요." }],
  guidelineReferences: [],
};
