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
  const titleByRelation = {
    "비견·겁재의 관계":"주도성과 균형을 살펴보는 날",
    "식신·상관의 관계":"생각을 표현하고 정리하는 날",
    "정인·편인의 관계":"배움과 점검에 집중하는 날",
    "정재·편재의 관계":"현실적인 선택을 살펴보는 날",
    "관성의 관계":"책임과 약속을 돌아보는 날"
  };
  const textByRelation = {
    "비견·겁재의 관계":"오늘의 일진은 나와 같은 오행의 기운으로 분류됩니다. 전통 명리학에서는 자기 주도성이나 경쟁·협력의 주제를 함께 살펴봅니다. 주변과 속도를 맞추며 결정해 보세요.",
    "식신·상관의 관계":"오늘의 일진은 나의 일간이 생하는 오행으로 분류됩니다. 전통 명리학에서는 표현과 결과물, 배움의 활용이라는 주제로 풀이합니다. 떠오른 생각을 차분히 정리해 보세요.",
    "정인·편인의 관계":"오늘의 일진은 나를 생하는 오행으로 분류됩니다. 전통 명리학에서는 배움과 도움, 생각을 정돈하는 주제로 풀이합니다. 새로운 정보를 확인하고 기본을 점검해 보세요.",
    "정재·편재의 관계":"오늘의 일진은 내가 극하는 오행으로 분류됩니다. 전통 명리학에서는 현실적인 목표와 자원 관리의 주제로 풀이합니다. 우선순위를 정하고 필요한 선택인지 살펴보세요.",
    "관성의 관계":"오늘의 일진은 나를 극하는 오행으로 분류됩니다. 전통 명리학에서는 규칙과 책임, 역할의 주제로 풀이합니다. 해야 할 일을 정리하고 무리하지 않는 범위에서 약속을 지켜 보세요."
  };
  return {
    title: titleByRelation[relation],
    text: textByRelation[relation],
    detail: `${formatKoreanDate(value)} · 일진 ${targetDay} · 나의 일간 ${natalGan}(${natalElement}) · ${relation}`,
    targetDay
  };
}

function updateDailyFortune(value) {
  const reading = buildDailyReading(value);
  if (!reading) {
    $("#dailyTitle").textContent = "사주 정보를 먼저 입력해 주세요";
    $("#dailyText").textContent = "생년월일을 입력하면 선택한 날짜의 간지와 나의 일간을 비교한 전통 오행 관계 해석을 보여드립니다.";
    $("#dateResult").textContent = "사주 정보를 먼저 입력해 주세요.";
    return;
  }
  $("#dailyTitle").textContent = reading.title;
  $("#dailyText").textContent = reading.text;
  $("#dateResult").textContent = reading.detail;
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

$("#checkDate").addEventListener("click", () => {
  const value = $("#fortuneDate").value;
  if (!value) {
    $("#dateResult").textContent = "먼저 날짜를 선택해 주세요.";
    return;
  }
  try {
    parseDate(value);
    if (!currentChart) {
      $("#dateResult").textContent = "먼저 나의 사주 정보를 입력해 주세요.";
      return;
    }
    updateDailyFortune(value);
    $("#todayDate").textContent = formatKoreanDate(value);
  } catch (error) {
    $("#dateResult").textContent = error.message;
  }
});

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
