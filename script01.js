const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const fmt = (n) => Math.floor(n).toLocaleString("en-US");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ZODIAC = [[1, 20, "Aquarius"], [2, 19, "Pisces"], [3, 21, "Aries"], [4, 20, "Taurus"], [5, 21, "Gemini"], [6, 21, "Cancer"], [7, 23, "Leo"], [8, 23, "Virgo"], [9, 23, "Libra"], [10, 23, "Scorpio"], [11, 22, "Sagittarius"], [12, 22, "Capricorn"]];

const groups = {
    dob: { d: $("dob-d"), m: $("dob-m"), y: $("dob-y"), el: document.querySelector('[data-group="dob"]') },
    target: { d: $("tg-d"), m: $("tg-m"), y: $("tg-y"), el: $("target-group") },
    other: { d: $("ot-d"), m: $("ot-m"), y: $("ot-y"), el: $("other-group") }
};

const errorBox = $("error");
const useTarget = $("use-target");

let timer = null;
let other = null;
let activeGroup = "dob";
let view = { y: new Date().getFullYear(), m: new Date().getMonth() };

/* ==============================
   INPUT BOXES
============================== */
Object.entries(groups).forEach(([name, g]) => {
    const order = [g.d, g.m, g.y];

    order.forEach((input, i) => {
        input.addEventListener("focus", () => {
            activeGroup = name;
            updateCalendarLabel();
            renderCalendar();
        });

        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
            g.el.classList.remove("invalid");
            errorBox.textContent = "";

            if (input.value.length === input.maxLength && order[i + 1]) {
                order[i + 1].focus();
            }

            syncCalendarView();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && order[i - 1]) {
                order[i - 1].focus();
            }
            if (e.key === "Enter") {
                calculate();
            }
        });
    });
});

/* ==============================
   READ + VALIDATE
============================== */
function readGroup(name) {
    const g = groups[name];
    const label = { dob: "date of birth", target: "target date", other: "second date of birth" }[name];

    if (!g.d.value || !g.m.value || !g.y.value) {
        return { error: "Please fill in day, month and year for the " + label + "." };
    }

    const d = Number(g.d.value);
    const m = Number(g.m.value);
    const y = Number(g.y.value);

    if (g.y.value.length !== 4 || y < 1900) {
        return { error: "Please enter a 4-digit year from 1900 onwards." };
    }

    const date = new Date(y, m - 1, d);

    if (m < 1 || m > 12 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        return { error: "That " + label + " does not exist. Check the day and month." };
    }

    return { date };
}

/* ==============================
   AGE MATHS
============================== */
// Add months to a date; if the day does not exist (e.g. 31 Sept), use the last day of that month
function addMonthsClamped(date, n) {
    const r = new Date(date.getFullYear(), date.getMonth() + n, 1);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(date.getDate(), last));
    r.setHours(date.getHours(), date.getMinutes(), 0, 0);
    return r;
}

function breakdown(b, t) {
    let totalMonths = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
    let anchor = addMonthsClamped(b, totalMonths);

    if (anchor > t) {
        totalMonths--;
        anchor = addMonthsClamped(b, totalMonths);
    }

    const rem = t - anchor;

    return {
        y: Math.floor(totalMonths / 12),
        m: totalMonths % 12,
        d: Math.floor(rem / 86400000),
        h: Math.floor((rem % 86400000) / 3600000),
        mi: Math.floor((rem % 3600000) / 60000),
        s: Math.floor((rem % 60000) / 1000)
    };
}

function zodiacOf(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    let sign = "Capricorn";

    ZODIAC.forEach((z) => {
        if (m > z[0] || (m === z[0] && d >= z[1])) sign = z[2];
    });

    return sign;
}

/* ==============================
   RENDER RESULT
============================== */
function render(b, t) {
    const a = breakdown(b, t);

    $("years").textContent = a.y;
    $("months").textContent = a.m;
    $("days").textContent = a.d;
    $("hours").textContent = a.h;
    $("minutes").textContent = a.mi;
    $("seconds").textContent = a.s;

    $("summary").textContent =
        a.y + " years, " + a.m + " months and " + a.d + " days" +
        (b.getFullYear() === t.getFullYear() && b.getMonth() === t.getMonth() && b.getDate() === t.getDate() ? " (born today)" : "");

    const ms = t - b;
    const totalMonths = a.y * 12 + a.m;

    $("t-months").textContent = fmt(totalMonths);
    $("t-weeks").textContent = fmt(ms / 604800000);
    $("t-days").textContent = fmt(ms / 86400000);
    $("t-hours").textContent = fmt(ms / 3600000);
    $("t-minutes").textContent = fmt(ms / 60000);
    $("t-seconds").textContent = fmt(ms / 1000);

    $("born-day").textContent = b.toLocaleDateString("en-US", { weekday: "long" });
    $("zodiac").textContent = zodiacOf(b);
    renderCompare(b, t);

    // Next birthday
    const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    let n = Math.max(1, t.getFullYear() - b.getFullYear());
    let next = addMonthsClamped(b, n * 12);

    if (new Date(next.getFullYear(), next.getMonth(), next.getDate()) < today) {
        n++;
        next = addMonthsClamped(b, n * 12);
    }

    const weekday = next.toLocaleDateString("en-US", { weekday: "long" });
    const dateText = next.getDate() + " " + MONTHS[next.getMonth()] + " " + next.getFullYear();
    const turning = next.getFullYear() - b.getFullYear();

    if (next.toDateString() === today.toDateString()) {
        $("next-bday").textContent = "Today";
        $("bday-note").textContent = "Happy birthday! You turn " + turning + " today.";
        $("bday-bar").style.width = "100%";
    } else {
        const left = next - t;
        const daysLeft = Math.floor(left / 86400000);
        const hoursLeft = Math.floor((left % 86400000) / 3600000);
        const last = addMonthsClamped(b, (n - 1) * 12);
        const pct = Math.max(0, Math.min(100, ((t - last) / (next - last)) * 100));

        $("next-bday").textContent = weekday + ", " + dateText;
        $("bday-note").textContent = daysLeft + " days and " + hoursLeft + " hours left until you turn " + turning + ".";
        $("bday-bar").style.width = pct.toFixed(1) + "%";
    }
}

/* ==============================
   CALCULATE
============================== */
function calculate() {
    clearInterval(timer);
    errorBox.textContent = "";

    const dob = readGroup("dob");

    if (dob.error) {
        groups.dob.el.classList.add("invalid");
        errorBox.textContent = dob.error;
        return;
    }

    const now = new Date();

    if (useTime.checked) {
        const th = $("tm-h").value;
        const tmin = $("tm-m").value;

        if (th === "" || tmin === "" || Number(th) > 23 || Number(tmin) > 59) {
            errorBox.textContent = "Enter birth time as hour (0-23) and minute (0-59), or untick the birth time option.";
            return;
        }

        dob.date.setHours(Number(th), Number(tmin), 0, 0);
    }

    if (dob.date > now) {
        groups.dob.el.classList.add("invalid");
        errorBox.textContent = "Date of birth cannot be in the future.";
        return;
    }

    let target = null;

    if (useTarget.checked) {
        const tg = readGroup("target");

        if (tg.error) {
            groups.target.el.classList.add("invalid");
            errorBox.textContent = tg.error;
            return;
        }

        if (tg.date < dob.date) {
            groups.target.el.classList.add("invalid");
            errorBox.textContent = "The target date must be after the date of birth.";
            return;
        }

        target = tg.date;
    }

    other = null;

    if (useCompare.checked) {
        const ot = readGroup("other");

        if (ot.error || ot.date > now) {
            groups.other.el.classList.add("invalid");
            errorBox.textContent = ot.error || "The second date of birth cannot be in the future.";
            return;
        }

        other = ot.date;
    }

    $("empty").hidden = true;
    $("output").hidden = false;

    if (target) {
        render(dob.date, target);
    } else {
        render(dob.date, new Date());
        timer = setInterval(() => render(dob.date, new Date()), 1000);
    }

    if (window.innerWidth <= 860) {
        $("output").scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

$("calculate-btn").addEventListener("click", calculate);

$("clear-btn").addEventListener("click", () => {
    clearInterval(timer);
    Object.values(groups).forEach((g) => {
        g.d.value = g.m.value = g.y.value = "";
        g.el.classList.remove("invalid");
    });
    errorBox.textContent = "";
    other = null;
    $("output").hidden = true;
    $("empty").hidden = false;
    groups.dob.d.focus();
    renderCalendar();
});

useTarget.addEventListener("change", () => {
    groups.target.el.hidden = !useTarget.checked;

    if (useTarget.checked) {
        const n = new Date();
        groups.target.d.value = pad(n.getDate());
        groups.target.m.value = pad(n.getMonth() + 1);
        groups.target.y.value = n.getFullYear();
        activeGroup = "target";
    } else {
        activeGroup = "dob";
    }

    updateCalendarLabel();
    renderCalendar();
});

/* ==============================
   CALENDAR
============================== */
const calMonth = $("cal-month");
const calYear = $("cal-year");
const calGrid = $("cal-grid");

MONTHS.forEach((name, i) => calMonth.add(new Option(name, i)));

for (let y = new Date().getFullYear() + 100; y >= 1900; y--) {
    calYear.add(new Option(y, y));
}

function updateCalendarLabel() {
    $("cal-target").textContent = { dob: "your date of birth", target: "the target date", other: "the second date of birth" }[activeGroup];
}

function selectedDate() {
    const r = readGroup(activeGroup);
    return r.date || null;
}

function syncCalendarView() {
    const s = selectedDate();
    if (s) {
        view = { y: s.getFullYear(), m: s.getMonth() };
    }
    renderCalendar();
}

function renderCalendar() {
    calMonth.value = view.m;
    calYear.value = view.y;
    calGrid.innerHTML = "";

    const first = new Date(view.y, view.m, 1).getDay();
    const total = new Date(view.y, view.m + 1, 0).getDate();
    const today = new Date();
    const sel = selectedDate();

    for (let i = 0; i < first; i++) {
        const blank = document.createElement("button");
        blank.className = "blank";
        blank.tabIndex = -1;
        calGrid.appendChild(blank);
    }

    for (let day = 1; day <= total; day++) {
        const cell = document.createElement("button");
        const date = new Date(view.y, view.m, day);

        cell.type = "button";
        cell.textContent = day;

        if (activeGroup !== "target" && date > today) cell.disabled = true;

        if (date.toDateString() === today.toDateString()) cell.classList.add("today");
        if (sel && date.toDateString() === sel.toDateString()) cell.classList.add("selected");

        cell.addEventListener("click", () => {
            const g = groups[activeGroup];
            g.d.value = pad(day);
            g.m.value = pad(view.m + 1);
            g.y.value = view.y;
            g.el.classList.remove("invalid");
            errorBox.textContent = "";
            renderCalendar();
            calculate();
        });

        calGrid.appendChild(cell);
    }
}

function shiftMonth(step) {
    view.m += step;

    if (view.m < 0) { view.m = 11; view.y--; }
    if (view.m > 11) { view.m = 0; view.y++; }

    renderCalendar();
}

$("cal-prev").addEventListener("click", () => shiftMonth(-1));
$("cal-next").addEventListener("click", () => shiftMonth(1));

calMonth.addEventListener("change", () => { view.m = Number(calMonth.value); renderCalendar(); });
calYear.addEventListener("change", () => { view.y = Number(calYear.value); renderCalendar(); });

$("cal-today").addEventListener("click", () => {
    const n = new Date();
    view = { y: n.getFullYear(), m: n.getMonth() };
    renderCalendar();
});

updateCalendarLabel();
renderCalendar();

/* ==============================
   COMPARE, BIRTH TIME, THEME
============================== */
const useTime = $("use-time");
const useCompare = $("use-compare");

function renderCompare(b, t) {
    const box = $("compare");

    if (!other) {
        box.hidden = true;
        return;
    }

    const a1 = breakdown(b, t);
    const a2 = breakdown(other, t);
    const text = (a) => a.y + " years, " + a.m + " months, " + a.d + " days";

    $("cmp-1").textContent = "Person 1: " + text(a1);
    $("cmp-2").textContent = "Person 2: " + text(a2);

    if (b.getTime() === other.getTime()) {
        $("cmp-diff").textContent = "Both were born at the same time.";
    } else {
        const first = b < other ? b : other;
        const second = first === b ? other : b;
        const gap = breakdown(first, second);
        const who = first === b ? "Person 1" : "Person 2";
        const parts = gap.y + " years, " + gap.m + " months and " + gap.d + " days";

        $("cmp-diff").textContent = who + " is older by " + parts + " (" + fmt((second - first) / 86400000) + " days in total).";
    }

    box.hidden = false;
}

useTime.addEventListener("change", () => {
    $("time-group").hidden = !useTime.checked;
    if (useTime.checked) $("tm-h").focus();
});

["tm-h", "tm-m"].forEach((id, i, arr) => {
    const input = $(id);

    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "");
        errorBox.textContent = "";
        if (input.value.length === 2 && arr[i + 1]) $(arr[i + 1]).focus();
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && i > 0) $(arr[i - 1]).focus();
        if (e.key === "Enter") calculate();
    });
});

useCompare.addEventListener("change", () => {
    groups.other.el.hidden = !useCompare.checked;
    activeGroup = useCompare.checked ? "other" : "dob";
    if (useCompare.checked) groups.other.d.focus();
    updateCalendarLabel();
    renderCalendar();
});

const root = document.documentElement;
const themeBtn = $("theme-btn");

function setTheme(mode) {
    root.dataset.theme = mode;
    themeBtn.textContent = mode === "dark" ? "Light mode" : "Dark mode";
    try { localStorage.setItem("age-theme", mode); } catch (e) {}
}

let savedTheme = null;
try { savedTheme = localStorage.getItem("age-theme"); } catch (e) {}

setTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

themeBtn.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
