(() => {
    "use strict";

    const byId = (id) => document.getElementById(id);
    const pad = (number) => String(number).padStart(2, "0");
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const buttons = document.querySelectorAll("[data-format]");
    const themeButton = byId("theme-toggle");
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    let theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const RAD = Math.PI / 180;
    // 24 节气对应太阳黄经每 15° 一个节点；month/day 只是迭代初值。
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
    // 农历节日按“月-日”查找，闰月中的同名日期不重复庆祝。
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
    // 固定公历日期上的现代节日和法定假日核心日期。
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
    // 传统节日使用红色，其余节日使用常规文字颜色。
    const TRADITIONAL_FESTIVALS = new Set([
        "除夕", "春节", "元宵节", "龙抬头", "花朝节", "上巳节", "寒食节",
        "清明节", "端午节", "七夕节", "中元节", "中秋节", "重阳节",
        "寒衣节", "下元节", "腊八节", "小年（北方）", "小年（南方）",
    ]);
    let format = "24";
    let timer;
    // 农历、节气和下一个事件都按日期/年份缓存，避免每秒重复计算。
    const lunarCache = new Map();
    const solarTermCache = new Map();
    let nextEventCacheKey = "";
    let nextEventCacheValue = null;

    function dateKey(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function getLunarParts(date) {
        // 农历数据由 lunar.js 内置表计算，不依赖浏览器 Intl 日历支持。
        const key = dateKey(date);
        if (lunarCache.has(key)) return lunarCache.get(key);
        let lunar = null;
        try {
            lunar = window.LunarCalendar
                ? window.LunarCalendar.toLunar(date.getFullYear(), date.getMonth() + 1, date.getDate())
                : null;
        } catch (_) {
            lunar = null;
        }
        lunarCache.set(key, lunar);
        return lunar;
    }

    function renderLunarDate(now) {
        const lunar = getLunarParts(now);
        if (!lunar) {
            byId("lunar-date").textContent = "农历数据暂不可用";
            return null;
        }
        byId("lunar-date").textContent = `${lunar.yearName}年 · ${lunar.monthName}${lunar.dayName}`;
        return lunar;
    }

    function julianDay(timestamp) {
        return timestamp / 86400000 + 2440587.5;
    }

    function sunLongitude(julian) {
        // 低精度太阳视黄经公式，误差足够用于确定节气的公历日期。
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
        // 从近似日期出发做牛顿迭代，求出太阳到达目标黄经的时刻。
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
        // 明天是农历正月初一，则今天为除夕。
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
        // 汇总公历节日、农历节日、节气以及按星期计算的节日。
        const names = [];
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const solarNames = SOLAR_FESTIVALS[`${month}-${day}`];
        if (solarNames) names.push(...solarNames);
        if (todayTerm && todayTerm.name === "清明") names.push("清明节");
        if (month === 5 && day === nthWeekdayOfMonth(now.getFullYear(), 4, 0, 2)) names.push("母亲节");
        if (month === 6 && day === nthWeekdayOfMonth(now.getFullYear(), 5, 0, 3)) names.push("父亲节");
        if (month === 11 && day === nthWeekdayOfMonth(now.getFullYear(), 10, 4, 4)) names.push("感恩节");
        if (lunar && !lunar.isLeap) {
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
        // 把某一天的节气、农历和节日整理成统一快照。
        const key = dateKey(date);
        const terms = getSolarTerms(date.getFullYear());
        const term = terms.find((item) => item.key === key) || null;
        const lunar = getLunarParts(date);
        const festivals = festivalNames(date, lunar, term, terms);
        return { date, term, festivals };
    }

    function getNextEvent(now) {
        // 从明天开始顺序查找，最近的节气或节日即为下一次提示。
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
        // 传统节日单独着色，日期作为同一行的后缀显示。
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
        // 当天有事件就显示当天内容，否则显示下一个最近事件。
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
        const suffix = `${next.date.getMonth() + 1}月${next.date.getDate()}日`;
        renderNote(events, "", suffix);
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

    function applyTheme(nextTheme) {
        // 同步页面主题、浏览器主题色和 iOS 状态栏样式。
        theme = nextTheme;
        document.documentElement.dataset.theme = nextTheme;
        themeButton.setAttribute("aria-pressed", String(nextTheme === "dark"));
        themeButton.setAttribute("aria-label", nextTheme === "dark" ? "切换浅色背景" : "切换黑色背景");
        if (themeColorMeta) {
            themeColorMeta.setAttribute("content", nextTheme === "dark" ? "#080a09" : "#f4f1e9");
        }
        if (statusBarMeta) {
            statusBarMeta.setAttribute("content", nextTheme === "dark" ? "black-translucent" : "default");
        }
    }

    function updateNightDim(now) {
        // 使用设备本地时间判断夜间时段：22:00 至次日 07:00。
        const hour = now.getHours();
        document.documentElement.classList.toggle("is-night-dim", hour >= 21 || hour < 7);
    }

    function render() {
        // 每次渲染都重新读取设备时间，避免后台休眠造成计时漂移。
        const now = new Date();
        updateNightDim(now);
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
    themeButton.addEventListener("click", () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        try { localStorage.setItem("moment-theme", nextTheme); } catch (_) { }
    });
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    window.addEventListener("focus", tick);
    applyTheme(theme);
    updateButtons();
    tick();
})();
