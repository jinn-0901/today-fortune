const $ = (selector) => document.querySelector(selector);

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKoreanDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long"
  }).format(date);
}

const dailyMessages = [
  ["차분히 방향을 살펴볼 때", "작은 선택도 차분히 살피면 더 나은 흐름으로 이어질 수 있어요. 오늘은 익숙한 일부터 하나씩 정리해 보세요."],
  ["꾸준함이 힘을 발휘하는 날", "눈에 띄는 변화보다 반복하는 과정에 의미가 있습니다. 서두르지 말고 지금의 리듬을 지켜 보세요."],
  ["새로운 관점을 열어 보는 날", "평소와 다른 방법을 가볍게 시도해 보세요. 익숙한 문제에서도 새로운 가능성을 발견할 수 있습니다."],
  ["주변을 살피며 균형을 찾는 날", "나의 속도와 주변의 흐름을 함께 살펴보세요. 충분히 듣고 생각한 뒤 결정해도 늦지 않습니다."],
  ["작은 정리가 큰 여유를 만드는 날", "미뤄 둔 일을 하나씩 정리하면 생각보다 마음이 가벼워질 수 있어요. 가장 쉬운 일부터 시작해 보세요."],
  ["배움에 집중하기 좋은 날", "모르는 것을 그냥 지나치지 말고 한 번 더 살펴보세요. 오늘의 작은 호기심이 다음 단계의 밑거름이 됩니다."],
  ["잠시 멈춰 흐름을 돌아보는 날", "바쁘게 움직이기보다 지금까지의 과정을 돌아보세요. 잠깐의 여유가 다음 선택을 또렷하게 해줄 수 있습니다."]
];

function messageForDate(value) {
  const date = new Date(`${value}T12:00:00`);
  const seed = Math.abs(date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate());
  return dailyMessages[seed % dailyMessages.length];
}

function updateDailyFortune(value) {
  const [title, text] = messageForDate(value);
  $("#dailyTitle").textContent = title;
  $("#dailyText").textContent = text;
}

const today = localDateString();
$("#todayDate").textContent = formatKoreanDate(today);
$("#fortuneDate").value = today;
updateDailyFortune(today);

$("#sajuForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const birthDate = form.get("birthDate");
  const calendarType = form.get("calendarType") === "lunar" ? "음력" : "양력";
  const birthTime = form.get("birthTime");
  const timeText = birthTime === "unknown" ? "출생 시간 미상" : birthTime;
  const result = $("#formResult");
  result.hidden = false;
  result.textContent = `${formatKoreanDate(birthDate)} · ${calendarType} · ${timeText}. 입력 정보가 확인됐어요. 정통 사주 명식과 개인별 풀이는 만세력 계산 엔진을 연결한 뒤 제공할 예정입니다. 입력 정보는 저장하거나 서버로 전송하지 않습니다.`;
});

$("#checkDate").addEventListener("click", () => {
  const value = $("#fortuneDate").value;
  const output = $("#dateResult");
  if (!value) {
    output.textContent = "먼저 날짜를 선택해 주세요.";
    return;
  }
  const [title, text] = messageForDate(value);
  output.textContent = `${formatKoreanDate(value)} — ${title}. ${text}`;
  updateDailyFortune(value);
  $("#todayDate").textContent = formatKoreanDate(value);
});

const menuToggle = $("#menuToggle");
const mainNav = $(".main-nav");
menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
});
mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});