(() => {
    "use strict";

    // 农历转换模块：提供 1900–2100 年公历转农历，不依赖 Intl/ICU。
    // 对外接口：window.LunarCalendar.toLunar(year, month, day)。
    // 1900–2100 年农历数据，每个年份用一个整数压缩存储。
    // 低 4 位：闰月月份，0 表示无闰月。
    // bit 16：闰月天数，1=30 天，0=29 天。
    // bit 15..4：十二个常规月份的天数，1=30 天，0=29 天。
    const LUNAR_INFO = [
        0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
        0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
        0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
        0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
        0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
        0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
        0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
        0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
        0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
        0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
        0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
        0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
        0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
        0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
        0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
        0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
        0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
        0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
        0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
        0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
        0x0d520,
    ];
    const STEMS = "甲乙丙丁戊己庚辛壬癸";
    const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
    const MONTH_NAMES = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
    const DAY_DIGITS = "一二三四五六七八九";

    function leapMonth(year) {
        // 低 4 位记录闰月月份，0 表示该年没有闰月。
        return LUNAR_INFO[year - 1900] & 0xf;
    }

    function leapDays(year) {
        if (!leapMonth(year)) return 0;
        return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29;
    }

    function monthDays(year, month) {
        return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29;
    }

    function lunarYearDays(year) {
        // 348 天是 12 个 29 天月份的总和，再补上所有 30 天月份的额外一天。
        let days = 348;
        for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
            if (LUNAR_INFO[year - 1900] & bit) days += 1;
        }
        return days + leapDays(year);
    }

    function monthsOfYear(year) {
        // 展开成按实际顺序排列的月份列表，闰月紧跟同名的常规月份。
        const leap = leapMonth(year);
        const months = [];
        for (let month = 1; month <= 12; month += 1) {
            months.push({ month, isLeap: false, days: monthDays(year, month) });
            if (month === leap) {
                months.push({ month, isLeap: true, days: leapDays(year) });
            }
        }
        return months;
    }

    function lunarDayName(day) {
        if (day === 10) return "初十";
        if (day === 20) return "二十";
        if (day === 30) return "三十";
        const prefix = day < 10 ? "初" : day < 20 ? "十" : "廿";
        return prefix + DAY_DIGITS[(day - 1) % 10];
    }

    function toLunar(year, month, day) {
        // 以 1900-01-31（农历 1900 年正月初一）为基准按天偏移。
        if (year < 1900 || year > 2100) return null;

        const base = Date.UTC(1900, 0, 31);
        const target = Date.UTC(year, month - 1, day);
        let offset = Math.floor((target - base) / 86400000);
        if (offset < 0) return null;

        // 先逐年扣除天数，再在目标年份内逐月扣除天数。
        let lunarYear = 1900;
        while (lunarYear <= 2100 && offset >= lunarYearDays(lunarYear)) {
            offset -= lunarYearDays(lunarYear);
            lunarYear += 1;
        }
        if (lunarYear > 2100) return null;

        let currentMonth = null;
        for (const entry of monthsOfYear(lunarYear)) {
            if (offset < entry.days) {
                currentMonth = entry;
                break;
            }
            offset -= entry.days;
        }
        if (!currentMonth) return null;

        const lunarDay = offset + 1;
        return {
            year: lunarYear,
            month: currentMonth.month,
            day: lunarDay,
            isLeap: currentMonth.isLeap,
            yearName: STEMS[(lunarYear - 4) % 10] + BRANCHES[(lunarYear - 4) % 12],
            monthName: (currentMonth.isLeap ? "闰" : "")
                + MONTH_NAMES[currentMonth.month - 1]
                + "月",
            dayName: lunarDayName(lunarDay),
        };
    }

    window.LunarCalendar = { toLunar };
})();
