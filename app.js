const $ = (selector) => document.querySelector(selector);

const STEM_ELEMENTS = { "甲":"목", "乙":"목", "丙":"화", "丁":"화", "戊":"토", "己":"토", "庚":"금", "辛":"금", "壬":"수", "癸":"수" };
const BRANCH_ELEMENTS = { "子":"수", "丑":"토", "寅":"목", "卯":"목", "辰":"토", "巳":"화", "午":"화", "未":"토", "申":"금", "酉":"금", "戌":"토", "亥":"수" };
const ELEMENT_NAMES = ["목", "화", "토", "금", "수"];
const ELEMENT_COLORS = { "목":"#658b68", "화":"#bd765d", "토":"#b59a62", "금":"#8c9ba7", "수":"#6486a8" };
const TIME_HOURS = { "子時":23, "丑時":1, "寅時":3, "卯時":5, "辰時":7, "巳時":9, "午時":11, "未時":13, "申時":15, "酉時":17, "戌時":19, "亥時":21 };

let currentChart = null;
let currentBirth = null;

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

function parseDate(value, lunarCalendar = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) throw new Error("생년월일 또는 날짜를 확인해 주세요.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (lunarCalendar) {
    if (month < 1 || month > 12 || day < 1 || day > 30) throw new Error("음력 날짜를 확인해 주세요.");
  } else {
    const check = new Date(year, month - 1, day);
    if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
      throw new Error("실제 양력 달력에 존재하는 날짜를 입력해 주세요.");
    }
  }
  if (year < 1900 || year > 2100) throw new Error("현재 계산 범위는 1900년부터 2100년까지입니다.");
  return { year, month, day };
}

function getLunarObject(birth, hour) {
  const { year, month, day } = birth;
  const hourValue = hour === "unknown" ? 12 : TIME_HOURS[hour];
  const minute = hour === "unknown" ? 0 : 30;
  const calendarType = document.querySelector('input[name="calendarType"]:checked').value;
  if (calendarType === "lunar") {
    return Lunar.fromYmdHms(year, month, day, hourValue, minute, 0);
  }
  return Solar.fromYmdHms(year, month, day, hourValue, minute, 0).getLunar();
}

function countElements(pillars) {
  const counts = { "목":0, "화":0, "토":0, "금":0, "수":0 };
  pillars.forEach((pillar) => {
    [...pillar].forEach((character) => {
      const element = STEM_ELEMENTS[character] || BRANCH_ELEMENTS[character];
      if (element) counts[element] += 1;
    });
  });
  return counts;
}

function renderChart(eightChar, birth, timeUnknown) {
  const pillars = [
    { label:"년주", value:eightChar.getYear(), god:eightChar.getYearShiShenGan() },
    { label:"월주", value:eightChar.getMonth(), god:eightChar.getMonthShiShenGan() },
    { label:"일주", value:eightChar.getDay(), god:"일간" },
    { label:"시주", value:timeUnknown ? "미상" : eightChar.getTime(), god:timeUnknown ? "미상" : eightChar.getTimeShiShenGan() }
  ];
  const activePillars = timeUnknown ? pillars.slice(0, 3) : pillars;
  const elements = countElements(activePillars.map((item) => item.value));
  const total = Object.values(elements).reduce((sum, value) => sum + value, 0);
  const elementMarkup = ELEMENT_NAMES.map((name) => {
    const count = elements[name];
    const width = total ? (count / total) * 100 : 0;
    return `<div class="element-row"><span>${name}</span><div class="element-track"><i style="width:${width}%;background:${ELEMENT_COLORS[name]}"></i></div><b>${count}</b></div>`;
  }).join("");
  const pillarMarkup = pillars.map((item) => `
    <div class="pillar-cell">
      <span class="pillar-label">${item.label}</span>
      <strong>${item.value}</strong>
      <small>${item.god}</small>
    </div>`).join("");
  $("#sajuResult").innerHTML = `
    <div class="result-heading"><span>SAJU CHART</span><strong>사주 원국</strong></div>
    <div class="pillars-grid">${pillarMarkup}</div>
    <div class="result-summary">
      <div><span class="result-caption">일간 · 나를 나타내는 기준</span><strong>${eightChar.getDayGan()} <small>(${STEM_ELEMENTS[eightChar.getDayGan()] || "오행"})</small></strong></div>
      <p>${timeUnknown ? "출생 시간을 알 수 없어 시주는 계산에서 제외했습니다." : "입력한 출생 시간의 시각 구간을 기준으로 시주를 계산했습니다."}</p>
    </div>
    <div class="element-summary"><div><strong>오행 분포</strong><span>천간과 지지의 기본 오행 기준</span></div>${elementMarkup}</div>
    <p class="result-note">오행 수치는 네 기둥의 천간·지지를 단순 집계한 값이며, 지장간·계절·왕쇠를 반영한 용신 판단과는 다릅니다.</p>
  `;
  $("#sajuResult").hidden = false;
  currentChart = eightChar;
  currentBirth = birth;
}

function elementRelation(dayElement, dateElement) {
  const generates = { "목":"화", "화":"토", "토":"금", "금":"수", "수":"목" };
  const controls = { "목":"토", "토":"수", "수":"화", "화":"금", "금":"목" };
  if (dayElement === dateElement) return "비견·겁재의 관계";
  if (generates[dayElement] === dateElement) return "식신·상관의 관계";
  if (generates[dateElement] === dayElement) return "정인·편인의 관계";
  if (controls[dayElement] === dateElement) return "정재·편재의 관계";
  return "관성의 관계";
}

function buildDailyReading(value) {
  if (!currentChart) return null;
  const { year, month, day } = parseDate(value);
  const targetLunar = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar();
  const targetPillar = targetLunar.getEightChar();
  const targetDay = targetPillar.getDay();
  const targetGan = targetPillar.getDayGan();
  const natalGan = currentChart.getDayGan();
  const natalElement = STEM_ELEMENTS[natalGan];
  const dailyElement = STEM_ELEMENTS[targetGan];
  const relation = elementRelation(natalElement, dailyElement);

  const readings = {
    "비견·겁재의 관계": {
      overall: ["자기 주도성을 살피는 날", "오늘은 내 생각과 주변의 의견이 비슷한 무게로 부딪힐 수 있는 흐름으로 풀이합니다. 다른 사람의 속도에 휩쓸리기보다 내가 정한 기준을 차분히 확인해 보세요."],
      study: ["혼자 점검하는 공부", "새로운 내용을 많이 늘리기보다 이미 배운 내용을 스스로 설명해 보는 방식이 잘 어울립니다. 친구와 함께 공부한다면 서로 답을 비교하되, 마지막에는 내 풀이로 정리해 보세요."],
      people: ["의견을 조율하는 관계", "친한 사람과도 생각이 다를 수 있는 날로 해석합니다. 누가 맞는지 서둘러 정하기보다 상대의 말을 끝까지 듣고 내 의견을 차분히 전해 보세요."],
      life: ["비교보다 나의 기준", "다른 사람의 선택이나 소비를 따라가기보다 지금 필요한 것이 무엇인지 먼저 살펴보세요. 작은 결정도 내 기준을 세우는 데 도움이 됩니다."],
      energy: ["속도를 조절하는 하루", "하고 싶은 일이 많아질 수 있으니 우선순위를 정해 보세요. 짧은 휴식과 규칙적인 식사처럼 기본적인 생활 리듬을 챙기는 것이 좋겠습니다."]
    },
    "식신·상관의 관계": {
      overall: ["표현과 실행에 힘을 싣는 날", "생각을 말이나 결과물로 옮기는 주제를 살펴보는 날입니다. 머릿속에만 두었던 일을 작게라도 시작하고, 완성한 내용을 한 번 더 다듬어 보세요."],
      study: ["배운 것을 직접 써보는 공부", "문제를 풀거나 글로 설명하는 등 배운 내용을 밖으로 꺼내는 방식이 어울립니다. 오답을 그냥 넘기지 말고 왜 틀렸는지 한 문장으로 적어 보세요."],
      people: ["말을 분명하게 전하기", "내 생각을 표현하기 좋은 주제로 풀이하지만 말이 앞서면 오해가 생길 수도 있습니다. 하고 싶은 말의 핵심을 먼저 정리한 뒤 부드럽게 전달해 보세요."],
      life: ["작은 결과물을 만드는 날", "시간이나 돈을 쓰기 전에 오늘 실제로 끝낼 수 있는 일을 정해 보세요. 계획을 크게 잡기보다 눈에 보이는 결과 하나를 만드는 데 집중해 보세요."],
      energy: ["활동과 휴식의 균형", "활동량이 늘어날 수 있는 흐름으로 해석합니다. 집중해서 움직인 뒤에는 잠깐 쉬며 다음 일정에 무리가 없는지 확인하세요."]
    },
    "정인·편인의 관계": {
      overall: ["배움과 정리에 집중하는 날", "정보를 받아들이고 생각을 정돈하는 주제로 풀이합니다. 새로운 것을 무작정 시작하기보다 필요한 자료를 확인하고 중요한 내용을 정리해 보세요."],
      study: ["개념을 다시 다지는 공부", "개념이나 원리를 이해하는 데 시간을 써보세요. 암기만 반복하기보다 왜 그런 답이 나오는지 스스로 설명하면 학습 내용을 정리하는 데 도움이 됩니다."],
      people: ["조언을 차분히 듣기", "주변의 말에서 참고할 점을 찾되 모든 의견을 그대로 따를 필요는 없습니다. 나에게 필요한 조언과 그렇지 않은 부분을 구분해 보세요."],
      life: ["정보를 확인한 뒤 결정하기", "무언가를 선택해야 한다면 조건과 내용을 한 번 더 확인하는 쪽에 무게를 두세요. 급하게 결론 내리기보다 충분히 알아보는 태도가 어울립니다."],
      energy: ["조용히 회복하는 시간", "생각이 많아질 수 있으니 잠시 화면을 내려놓고 쉬어 보세요. 수면과 휴식 시간을 일정하게 유지하는 데 신경 쓰면 좋겠습니다."]
    },
    "정재·편재의 관계": {
      overall: ["현실적인 목표를 살피는 날", "계획과 자원 관리의 주제로 풀이합니다. 해야 할 일을 중요도에 따라 나누고, 지금 가진 시간과 여건 안에서 실천할 수 있는 목표를 정해 보세요."],
      study: ["시간을 효율적으로 쓰는 공부", "공부 시간을 무작정 늘리기보다 목표를 작게 나누고 끝낸 내용을 확인해 보세요. 과목별로 남은 일을 정리하면 무엇부터 할지 분명해집니다."],
      people: ["약속과 역할을 확인하기", "함께하기로 한 일이 있다면 각자 맡은 부분과 시간을 다시 확인해 보세요. 사소한 약속을 지키는 태도가 관계의 신뢰를 만드는 데 도움이 됩니다."],
      life: ["계획적인 소비와 선택", "필요한 것과 원하는 것을 구분해 보는 날로 해석합니다. 무언가를 사거나 결정하기 전 한 번 더 생각하고, 꼭 필요한지 확인해 보세요."],
      energy: ["일정에 여유 남기기", "해야 할 일을 현실적으로 배분하고 중간에 쉴 시간도 남겨 두세요. 무리하게 일정을 채우지 않는 것이 중요합니다."]
    },
    "관성의 관계": {
      overall: ["책임과 약속을 돌아보는 날", "규칙과 책임, 역할을 점검하는 주제로 풀이합니다. 미뤄 둔 일을 확인하고 정해진 순서대로 하나씩 처리해 보세요."],
      study: ["계획을 지키는 공부", "정해 둔 공부 계획을 점검하고 기본적인 학습 습관을 지켜 보세요. 어려운 문제에 오래 머무르기보다 정해진 분량을 끝낸 뒤 다시 확인하는 방법도 좋습니다."],
      people: ["상대의 입장을 고려하기", "공동으로 해야 할 일이 있다면 내 역할을 먼저 확인해 보세요. 상대에게 요구하기 전에 내가 지킬 수 있는 약속부터 분명히 하는 것이 좋겠습니다."],
      life: ["우선순위와 규칙 점검", "중요한 일을 먼저 처리하고 마감이나 약속 시간을 확인해 보세요. 작은 실수를 줄이려면 시작 전에 필요한 것을 미리 챙기는 편이 좋습니다."],
      energy: ["무리하지 않는 일정", "책임감 때문에 일정을 과하게 잡지 않도록 주의해 보세요. 할 일을 마친 뒤에는 충분히 쉬고 다음 날을 준비하는 시간을 확보하세요."]
    }
  };

  const selected = readings[relation];
  return {
    title: selected.overall[0],
    text: selected.overall[1],
    detail: `${formatKoreanDate(value)} · 일진 ${targetDay} · 나의 일간 ${natalGan}(${natalElement}) · ${relation}`,
    targetDay,
    relation,
    categories: [
      { icon:"學", label:"학업운", kicker:"STUDY", title:selected.study[0], text:selected.study[1] },
      { icon:"人", label:"대인관계운", kicker:"PEOPLE", title:selected.people[0], text:selected.people[1] },
      { icon:"日", label:"생활·선택운", kicker:"DAILY LIFE", title:selected.life[0], text:selected.life[1] },
      { icon:"休", label:"컨디션운", kicker:"WELL-BEING", title:selected.energy[0], text:selected.energy[1] }
    ]
  };
}

function updateDailyFortune(value) {
  const reading = buildDailyReading(value);
  if (!reading) {
    $("#dailyTitle").textContent = "사주 정보를 먼저 입력해 주세요";
    $("#dailyText").textContent = "생년월일을 입력하면 선택한 날짜의 운세를 확인할 수 있습니다.";
    if ($("#dailyMeta")) $("#dailyMeta").textContent = "사주 정보를 입력하면 날짜별 간지와 오행 관계가 표시됩니다.";
    $("#dateResult").textContent = "사주 정보를 먼저 입력해 주세요.";
    return;
  }
  $("#dailyTitle").textContent = reading.title;
  $("#dailyText").textContent = reading.text;
  if ($("#dailyMeta")) $("#dailyMeta").textContent = reading.detail;
  $("#dateResult").textContent = reading.detail;

  const cards = $("#fortuneCards");
  if (cards) {
    cards.innerHTML = reading.categories.map((item) => `
      <article class="fortune-card">
        <span class="card-kicker">${item.kicker}</span>
        <h3>${item.label}</h3>
        <strong class="fortune-card-title">${item.title}</strong>
        <p>${item.text}</p>
      </article>
    `).join("");
  }
}

function showError(message) {
  const result = $("#formResult");
  result.hidden = false;
  result.textContent = message;
}

const today = localDateString();
$("#todayDate").textContent = formatKoreanDate(today);
$("#fortuneDate").value = today;

const PROFILE_STORAGE_KEY = "today-fortune-profile-v1";

function saveProfile(form) {
  const data = new FormData(form);
  const profile = {
    birthDate: data.get("birthDate"),
    calendarType: data.get("calendarType"),
    birthTime: data.get("birthTime"),
    gender: data.get("gender"),
    birthRegion: data.get("birthRegion")
  };
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    showError("이 브라우저에서는 입력 정보를 저장할 수 없습니다. 브라우저 저장 공간 설정을 확인해 주세요.");
  }
}

function restoreProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return false;
    const profile = JSON.parse(raw);
    if (!profile || !profile.birthDate || !profile.calendarType) return false;
    $("#birthDate").value = profile.birthDate;
    const calendarRadio = document.querySelector(`input[name="calendarType"][value="${profile.calendarType}"]`);
    if (calendarRadio) calendarRadio.checked = true;
    $("#birthTime").value = profile.birthTime || "unknown";
    $("#gender").value = profile.gender || "";
    $("#birthRegion").value = profile.birthRegion || "";
    return true;
  } catch (error) {
    return false;
  }
}

function calculateSaju(shouldScroll = true) {
  try {
    if (typeof Lunar === "undefined" || typeof Solar === "undefined") {
      throw new Error("내장 만세력 파일을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
    }
    const form = new FormData($("#sajuForm"));
    const calendarType = form.get("calendarType");
    const birth = parseDate(form.get("birthDate"), calendarType === "lunar");
    const time = form.get("birthTime");
    const lunar = getLunarObject(birth, time);
    const eightChar = lunar.getEightChar();
    eightChar.setSect(2);
    renderChart(eightChar, birth, time === "unknown");
    saveProfile($("#sajuForm"));
    $("#formResult").hidden = true;
    updateDailyFortune($("#fortuneDate").value || today);
    if (shouldScroll) $("#sajuResult").scrollIntoView({ behavior:"smooth", block:"nearest" });
  } catch (error) {
    showError(error.message || "사주를 계산하지 못했습니다. 입력한 정보를 확인해 주세요.");
  }
}

$("#sajuForm").addEventListener("submit", (event) => {
  event.preventDefault();
  calculateSaju(true);
});

function checkSelectedDate() {
  const value = $("#fortuneDate").value;
  const result = $("#dateResult");

  if (!value) {
    result.textContent = "먼저 날짜를 선택해 주세요.";
    return;
  }

  try {
    parseDate(value);

    // Recover the chart from the saved birth profile if the page state was reset.
    if (!currentChart && restoreProfile()) {
      calculateSaju(false);
    }

    if (!currentChart) {
      result.textContent = "먼저 생년월일을 입력하고 ‘사주 계산하기’를 눌러 주세요.";
      return;
    }

    const reading = buildDailyReading(value);
    if (!reading) {
      throw new Error("선택한 날짜의 운세를 계산하지 못했습니다.");
    }

    updateDailyFortune(value);
    result.textContent = "확인 완료 · " + reading.detail;
    $("#todayDate").textContent = formatKoreanDate(value);
  } catch (error) {
    result.textContent = "날짜 확인 중 오류가 발생했습니다: " + (error.message || "날짜를 다시 선택해 주세요.");
  }
}

$("#checkDate").addEventListener("click", checkSelectedDate);

$("#fortuneDate").addEventListener("change", () => {
  const value = $("#fortuneDate").value;
  if (value && currentChart) updateDailyFortune(value);
});

const menuToggle = $("#menuToggle");
const mainNav = $(".main-nav");
menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
});
// Restore the saved profile on this device and recalculate the chart.
if (restoreProfile()) calculateSaju(false);

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
