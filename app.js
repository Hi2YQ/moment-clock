(() => {
    "use strict";

    const byId = (id) => document.getElementById(id);
    const pad = (number) => String(number).padStart(2, "0");
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const buttons = document.querySelectorAll("[data-format]");
    let format = "24";
    let timer;
    let lunarFormatter;
    let lunarDateKey;

    try {
        lunarFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
            year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
        });
        if (lunarFormatter.resolvedOptions().calendar !== "chinese") lunarFormatter = null;
    } catch (_) {
        lunarFormatter = null;
    }

    function renderLunarDate(now, dateKey) {
        if (lunarDateKey === dateKey) return;
        lunarDateKey = dateKey;
        try {
            if (!lunarFormatter) throw new Error("Chinese calendar unavailable");
            // 将设备当地年月日映射到固定时区，避免农历与本地公历跨日错位。
            const localDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
            const parts = lunarFormatter.formatToParts(localDate);
            const part = (type) => (parts.find((item) => item.type === type) || {}).value;
            const day = Number(part("day"));
            const year = part("yearName") || part("relatedYear");
            const month = part("month");
            if (!year || !month || !Number.isInteger(day) || day < 1 || day > 30) {
                throw new Error("Invalid Chinese calendar date");
            }
            const digits = "一二三四五六七八九";
            const dayName = day === 10 ? "初十" : day === 20 ? "二十" : day === 30 ? "三十"
                : `${day < 10 ? "初" : day < 20 ? "十" : "廿"}${digits[(day - 1) % 10]}`;
            byId("lunar-date").textContent = `农历 ${year}年${month}${dayName}`;
        } catch (_) {
            byId("lunar-date").textContent = "当前浏览器暂不支持农历";
        }
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
        const date = `${year}-${pad(month + 1)}-${pad(day)}`;
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
        byId("date").dateTime = date;
        renderLunarDate(now, date);
        byId("greeting").textContent = hours < 6 ? "夜深了，放慢脚步" : hours < 12 ? "上午好，新的一天" : hours < 18 ? "下午好，从容继续" : "晚上好，享受此刻";

        const offset = -now.getTimezoneOffset();
        byId("utc-offset").textContent = `UTC${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;

        // 使用两个本地午夜计算日长，兼容夏令时切换的日期。
        const start = new Date(year, month, day);
        const end = new Date(year, month, day + 1);
        const percent = Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
        byId("day-percent").textContent = percent.toFixed(1);
        byId("day-progress").style.width = `${percent}%`;
        byId("day-meter").setAttribute("aria-valuenow", percent.toFixed(1));
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
