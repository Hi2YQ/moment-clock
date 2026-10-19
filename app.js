(() => {
    "use strict";

    const byId = (id) => document.getElementById(id);
    const pad = (number) => String(number).padStart(2, "0");
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const buttons = document.querySelectorAll("[data-format]");
    const RAD = Math.PI / 180;
    const SOLAR_TERMS = [
        { name: "小寒", longitude: 285, month: 0, day: 5 },
        { name: "大寒", longitude: 300, month: 0, day: 20 },
        { name: "立春", longitude: 315, month: 1, day: 4 },
        { name: "雨水", longitude: 330, month: 1, day: 19 },
        { name: "惊蛰", longitude: 345, month: 2, day: 5 },
        { name: "春分", longitude: 0, month: 2, day: 20 },
        { name: "清明", longitude: 15, month: 3, day: 5 },
        { name: "谷雨", longitude: 30, month: 3, day: 20 },
        { name: "立夏", longitude: 45, month: 4, day: 5 },
        { name: "小满", longitude: 60, month: 4, day: 21 },
        { name: "芒种", longitude: 75, month: 5, day: 5 },
        { name: "夏至", longitude: 90, month: 5, day: 21 },
        { name: "小暑", longitude: 105, month: 6, day: 7 },
        { name: "大暑", longitude: 120, month: 6, day: 22 },
        { name: "立秋", longitude: 135, month: 7, day: 7 },
        { name: "处暑", longitude: 150, month: 7, day: 23 },
        { name: "白露", longitude: 165, month: 8, day: 7 },
        { name: "秋分", longitude: 180, month: 8, day: 23 },
        { name: "寒露", longitude: 195, month: 9, day: 8 },
        { name: "霜降", longitude: 210, month: 9, day: 23 },
        { name: "立冬", longitude: 225, month: 10, day: 7 },
        { name: "小雪", longitude: 240, month: 10, day: 22 },
        { name: "大雪", longitude: 255, month: 11, day: 7 },
        { name: "冬至", longitude: 270, month: 11, day: 22 },
    ];
    const LUNAR_MONTHS = {
        "正月": 1, "二月": 2, "三月": 3, "四月": 4, "五月": 5, "六月": 6,
        "七月": 7, "八月": 8, "九月": 9, "十月": 10, "十一月": 11, "十二月": 12,
        "冬月": 11, "腊月": 12,
    };
    const LUNAR_FESTIVALS = {
        "1-15": ["元宵节"],
        "2-2": ["龙抬头"],
        "2-12": ["花朝节"],
        "3-3": ["上巳节"],
        "5-5": ["端午节"],
        "7-7": ["七夕节"],
        "7-15": ["中元节"],
        "8-15": ["中秋节"],
        "9-9": ["重阳节"],
        "10-1": ["寒衣节"],
        "10-15": ["下元节"],
        "12-8": ["腊八节"],
        "12-23": ["小年（北方）"],
        "12-24": ["小年（南方）"],
    };
    const SOLAR_FESTIVALS = {
        "1-1": ["元旦"],
        "2-14": ["情人节"],
        "3-8": ["妇女节"],
        "3-12": ["植树节"],
        "4-1": ["愚人节"],
        "5-1": ["劳动节"],
        "5-2": ["劳动节"],
        "5-4": ["青年节"],
        "6-1": ["儿童节"],
        "9-10": ["教师节"],
        "10-1": ["国庆节"],
        "10-2": ["国庆节"],
        "10-3": ["国庆节"],
        "10-31": ["万圣节"],
        "12-24": ["平安夜"],
        "12-25": ["圣诞节"],
    };
    const TRADITIONAL_FESTIVALS = new Set([
        "除夕", "春节", "元宵节", "龙抬头", "花朝节", "上巳节", "寒食节",
        "清明节", "端午节", "七夕节", "中元节", "中秋节", "重阳节",
        "寒衣节", "下元节", "腊八节", "小年（北方）", "小年（南方）",
    ]);
    let format = "24";
    let timer;
    let lunarFormatter;
    const lunarCache = new Map();
    const solarTermCache = new Map();
    let nextEventCacheKey = "";
    let nextEventCacheValue = null;

    try {
        lunarFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
            year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
        });
        if (lunarFormatter.resolvedOptions().calendar !== "chinese") lunarFormatter = null;
    } catch (_) {
        lunarFormatter = null;
    }

    function dateKey(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function getLunarParts(date) {
        if (!lunarFormatter) return null;
        const key = dateKey(date);
        if (lunarCache.has(key)) return lunarCache.get(key);
        try {
            // 将设备当地年月日映射到固定时区，避免农历与本地公历跨日错位。
            const localDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
            const parts = lunarFormatter.formatToParts(localDate);
            const part = (type) => (parts.find((item) => item.type === type) || {}).value;
            const day = Number(part("day"));
            const year = part("yearName") || part("relatedYear");
            const monthName = part("month") || "";
            const month = LUNAR_MONTHS[monthName.replace(/^闰/, "")] || 0;
            const result = year && monthName && Number.isInteger(day) && day >= 1 && day <= 30
                ? { year, monthName, month, day }
                : null;
            lunarCache.set(key, result);
            return result;
        } catch (_) {
            lunarCache.set(key, null);
            return null;
        }
    }

    function renderLunarDate(now) {
        const lunar = getLunarParts(now);
        if (!lunar) {
            byId("lunar-date").textContent = "当前浏览器暂不支持农历";
            return null;
        }
        const digits = "一二三四五六七八九";
        const day = lunar.day;
        const dayName = day === 10 ? "初十" : day === 20 ? "二十" : day === 30 ? "三十"
            : `${day < 10 ? "初" : day < 20 ? "十" : "廿"}${digits[(day - 1) % 10]}`;
        byId("lunar-date").textContent = `农历 ${lunar.year}年${lunar.monthName}${dayName}`;
        return lunar;
    }

    function julianDay(timestamp) {
        return timestamp / 86400000 + 2440587.5;
    }

    function sunLongitude(julian) {
        const t = (julian - 2451545.0) / 36525;
        const meanLongitude = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
        const meanAnomaly = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
        const equationOfCenter =
            (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(meanAnomaly * RAD)
            + (0.019993 - 0.000101 * t) * Math.sin(2 * meanAnomaly * RAD)
            + 0.000289 * Math.sin(3 * meanAnomaly * RAD);
        const omega = 125.04 - 1934.136 * t;
        const apparent = meanLongitude + equationOfCenter - 0.00569 - 0.00478 * Math.sin(omega * RAD);
        return ((apparent % 360) + 360) % 360;
    }

    function solarTermDate(year, term) {
        let julian = julianDay(Date.UTC(year, term.month, term.day, 12));
        for (let index = 0; index < 8; index += 1) {
            const difference = ((term.longitude - sunLongitude(julian) + 540) % 360) - 180;
            julian += difference / 0.98564736;
            if (Math.abs(difference) < 1e-7) break;
        }
        return new Date((julian - 2440587.5) * 86400000);
    }

    function getSolarTerms(year) {
        if (!solarTermCache.has(year)) {
            const terms = SOLAR_TERMS.map((term) => {
                const date = solarTermDate(year, term);
                return { name: term.name, date, key: dateKey(date) };
            }).sort((left, right) => left.date - right.date);
            solarTermCache.set(year, terms);
        }
        return solarTermCache.get(year);
    }

    function isLunarNewYearEve(now) {
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const lunar = getLunarParts(tomorrow);
        return Boolean(lunar && lunar.month === 1 && lunar.day === 1);
    }

    function nthWeekdayOfMonth(year, month, weekday, nth) {
        const first = new Date(year, month, 1);
        const offset = (weekday - first.getDay() + 7) % 7;
        return 1 + offset + (nth - 1) * 7;
    }

    function festivalNames(now, lunar, todayTerm, terms) {
        const names = [];
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const solarNames = SOLAR_FESTIVALS[`${month}-${day}`];
        if (solarNames) names.push(...solarNames);
        if (todayTerm && todayTerm.name === "清明") names.push("清明节");
        if (month === 5 && day === nthWeekdayOfMonth(now.getFullYear(), 4, 0, 2)) names.push("母亲节");
        if (month === 6 && day === nthWeekdayOfMonth(now.getFullYear(), 5, 0, 3)) names.push("父亲节");
        if (month === 11 && day === nthWeekdayOfMonth(now.getFullYear(), 10, 4, 4)) names.push("感恩节");
        if (lunar) {
            if (lunar.month === 12 && isLunarNewYearEve(now)) names.push("除夕");
            if (lunar.month === 1 && lunar.day >= 1 && lunar.day <= 3) names.push("春节");
            const lunarNames = LUNAR_FESTIVALS[`${lunar.month}-${lunar.day}`];
            if (lunarNames) names.push(...lunarNames);
        }
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const tomorrowKey = dateKey(tomorrow);
        if (terms.some((term) => term.name === "清明" && term.key === tomorrowKey)) names.push("寒食节");
        return [...new Set(names)];
    }

    function getDayEvents(date) {
        const key = dateKey(date);
        const terms = getSolarTerms(date.getFullYear());
        const term = terms.find((item) => item.key === key) || null;
        const lunar = getLunarParts(date);
        const festivals = festivalNames(date, lunar, term, terms);
        return { date, term, festivals };
    }

    function getNextEvent(now) {
        const today = dateKey(now);
        if (nextEventCacheKey === today) return nextEventCacheValue;
        let result = null;
        for (let offset = 1; offset <= 370; offset += 1) {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
            const snapshot = getDayEvents(date);
            if (snapshot.term || snapshot.festivals.length) {
                result = snapshot;
                break;
            }
        }
        nextEventCacheKey = today;
        nextEventCacheValue = result;
        return result;
    }

    function renderNote(events, prefix = "", suffix = "") {
        const note = byId("day-note");
        note.replaceChildren();
        if (prefix) note.append(prefix, " ");
        events.forEach((event, index) => {
            if (index) note.append(" · ");
            const span = document.createElement("span");
            span.textContent = event.text;
            if (event.traditional) span.className = "is-traditional";
            note.append(span);
        });
        if (suffix) note.append(" · ", suffix);
    }

    function renderDayExtras(now, lunar) {
        const note = byId("day-note");
        const today = dateKey(now);
        const terms = getSolarTerms(now.getFullYear());
        const todayTerm = terms.find((term) => term.key === today) || null;
        const festivals = festivalNames(now, lunar, todayTerm, terms);

        if (todayTerm || festivals.length) {
            const events = festivals.map((name) => ({
                text: name,
                traditional: TRADITIONAL_FESTIVALS.has(name),
            }));
            if (todayTerm && !festivals.some((name) => name.includes(todayTerm.name))) {
                events.push({ text: todayTerm.name, traditional: false });
            }
            renderNote(events);
            note.classList.add("is-today");
            return;
        }

        const next = getNextEvent(now);
        if (!next) {
            note.textContent = "";
            note.classList.remove("is-today");
            return;
        }

        const events = next.festivals.map((name) => ({
            text: name,
            traditional: TRADITIONAL_FESTIVALS.has(name),
        }));
        if (next.term && !next.festivals.some((name) => name.includes(next.term.name))) {
            events.push({ text: next.term.name, traditional: false });
        }
        const prefix = next.festivals.length ? "下个节日" : "下个节气";
        const suffix = `${next.date.getMonth() + 1}月${next.date.getDate()}日`;
        renderNote(events, prefix, suffix);
        note.classList.remove("is-today");
    }

    try {
        if (localStorage.getItem("moment-hour-format") === "12") format = "12";
    } catch (_) {
        // 隐私模式禁用存储时，时钟仍可正常使用。
    }

    function updateButtons() {
        buttons.forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.format === format));
        });
    }

    function render() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();
        const period = hours < 12 ? "上午" : "下午";
        const displayHours = format === "12" ? hours % 12 || 12 : hours;

        byId("hours").textContent = pad(displayHours);
        byId("minutes").textContent = pad(minutes);
        byId("seconds").textContent = pad(seconds);
        byId("period").hidden = format !== "12";
        byId("period").textContent = period;
        byId("time").dateTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        byId("time").setAttribute("aria-label", `${format === "12" ? period : ""}${displayHours}时${minutes}分${seconds}秒`);
        byId("month-year").textContent = `${year} 年 ${pad(month + 1)} 月`;
        byId("day").textContent = pad(day);
        byId("weekday").textContent = weekdays[now.getDay()];
        byId("date").dateTime = dateKey(now);
        const lunar = renderLunarDate(now);
        renderDayExtras(now, lunar);
        byId("greeting").textContent = hours < 6 ? "夜深了，放慢脚步" : hours < 12 ? "上午好，新的一天" : hours < 18 ? "下午好，从容继续" : "晚上好，享受此刻";

        const offset = -now.getTimezoneOffset();
        byId("utc-offset").textContent = `UTC${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;

        const ordinal = Math.round((Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
        const total = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
        byId("day-of-year").textContent = `今年的第 ${ordinal} / ${total} 天`;
    }

    function tick() {
        clearTimeout(timer);
        render();
        // 每次重新读取设备时间，避免后台休眠或计时器误差累积。
        if (!document.hidden) timer = setTimeout(tick, 1000 - Date.now() % 1000 + 10);
    }

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            format = button.dataset.format;
            try { localStorage.setItem("moment-hour-format", format); } catch (_) { }
            updateButtons();
            tick();
        });
    });
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    window.addEventListener("focus", tick);
    updateButtons();
    tick();
})();
