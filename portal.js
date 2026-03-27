(() => {
  const ACCESS_KEY = "portal_access_token";
  const REFRESH_KEY = "portal_refresh_token";
  const API_BASE_KEY = "portal_api_base";
  const DEFAULT_API_BASE = "http://127.0.0.1:8000";

  const apiBaseInput = document.getElementById("apiBaseInput");
  const apiStatus = document.getElementById("apiStatus");
  const saveApiBaseBtn = document.getElementById("saveApiBaseBtn");

  const loginForm = document.getElementById("loginForm");
  const loginStatus = document.getElementById("loginStatus");
  const registerForm = document.getElementById("registerForm");
  const registerStatus = document.getElementById("registerStatus");

  const sessionInfo = document.getElementById("sessionInfo");
  const dashboardContainer = document.getElementById("dashboardContainer");
  const logoutBtn = document.getElementById("logoutBtn");

  const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
  const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
  const getApiBaseRaw = () => localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;

  const normalizeApiBase = (value) => {
    let base = (value || "").trim().replace(/\/+$/, "");
    if (base.endsWith("/api")) {
      base = base.slice(0, -4);
    }
    return base;
  };

  const getApiBase = () => normalizeApiBase(getApiBaseRaw());

  const setStatus = (el, msg, ok = false) => {
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "#1f7a4a" : "#9e2b2b";
  };

  const setTokens = (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  };

  const clearSession = () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (options.auth && getAccessToken()) {
      headers.Authorization = `Bearer ${getAccessToken()}`;
    }

    const response = await fetch(`${getApiBase()}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
    }

    if (!response.ok) {
      const detail = (data && (data.detail || JSON.stringify(data))) || "Request failed";
      throw new Error(detail);
    }
    return data;
  }

  async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      const data = await request("/api/auth/token/refresh/", {
        method: "POST",
        body: { refresh },
      });
      localStorage.setItem(ACCESS_KEY, data.access);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  function roleName(role) {
    if (role === "student") return "طالب";
    if (role === "teacher") return "أستاذ";
    if (role === "admin") return "إداري";
    if (role === "guardian") return "ولي أمر";
    return role;
  }

  function renderCards(items) {
    return items
      .map(
        (item) => `
          <article class="card">
            <span class="tag">${item.tag}</span>
            <h3>${item.title}</h3>
            <p class="meta">${item.meta}</p>
            <p>${item.body}</p>
          </article>
        `
      )
      .join("");
  }

  async function renderStudentDashboard(user) {
    let dashboard = null;
    let logs = [];
    try {
      dashboard = await request("/api/dashboard/student/", { auth: true });
    } catch (err) {
      setStatus(loginStatus, `تعذر تحميل لوحة الطالب: ${err.message}`);
      return;
    }

    try {
      logs = await request("/api/wird-logs/?ordering=-log_date", { auth: true });
    } catch {
      logs = [];
    }

    const cards = [
      {
        tag: "التقدم",
        title: "النقاط الحالية",
        meta: `إجمالي النقاط: ${dashboard.total_points}`,
        body: `أيام الورد المسجلة: ${dashboard.total_logs} | الحضور: ${dashboard.attendance_present}`,
      },
      {
        tag: "الورد",
        title: "آخر سجل يومي",
        meta: logs[0] ? `تاريخ: ${logs[0].log_date}` : "لا يوجد سجل بعد",
        body: logs[0]
          ? `المستهدف: ${logs[0].target_ayat} | المنجز: ${logs[0].completed_ayat} | المراجعة: ${logs[0].review_ayat}`
          : "أضف أول سجل ورد يومي بعد تسجيل الدخول.",
      },
    ];

    dashboardContainer.innerHTML = `<div class="grid">${renderCards(cards)}</div>`;
    sessionInfo.textContent = `مرحبًا ${user.full_name} | الدور: ${roleName(user.role)}`;
    logoutBtn.classList.remove("hidden");
  }

  async function renderTeacherOrAdminDashboard(user) {
    const [groups, sessions, assessments] = await Promise.all([
      request("/api/class-groups/", { auth: true }).catch(() => []),
      request("/api/attendance-sessions/", { auth: true }).catch(() => []),
      request("/api/assessments/", { auth: true }).catch(() => []),
    ]);

    const cards = [
      {
        tag: "الحلقات",
        title: "إجمالي الحلقات",
        meta: `${groups.length || 0} حلقة`,
        body: "يمكن إدارة الحلقات وتوزيع الطلبة من نفس البوابة.",
      },
      {
        tag: "الحضور",
        title: "جلسات الحضور",
        meta: `${sessions.length || 0} جلسة`,
        body: "سجل حضور الطلبة بسهولة خلال الحلقة.",
      },
      {
        tag: "التقييم",
        title: "تقييمات الحفظ",
        meta: `${assessments.length || 0} تقييم`,
        body: "تقييمات التجويد والمخارج متاحة للمتابعة.",
      },
    ];

    dashboardContainer.innerHTML = `<div class="grid">${renderCards(cards)}</div>`;
    sessionInfo.textContent = `مرحبًا ${user.full_name} | الدور: ${roleName(user.role)}`;
    logoutBtn.classList.remove("hidden");
  }

  function renderGuardianDashboard(user) {
    const cards = [
      {
        tag: "ولي أمر",
        title: "متابعة الأبناء",
        meta: "قريبًا",
        body: "سيتم عرض التقييمات والحضور عند ربط حسابات الأبناء.",
      },
    ];
    dashboardContainer.innerHTML = `<div class="grid">${renderCards(cards)}</div>`;
    sessionInfo.textContent = `مرحبًا ${user.full_name} | الدور: ${roleName(user.role)}`;
    logoutBtn.classList.remove("hidden");
  }

  async function loadSession() {
    const token = getAccessToken();
    if (!token) {
      sessionInfo.textContent = "غير مسجّل الدخول";
      dashboardContainer.innerHTML = "";
      logoutBtn.classList.add("hidden");
      return;
    }

    let user = null;
    try {
      user = await request("/api/auth/me/", { auth: true });
    } catch {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearSession();
        sessionInfo.textContent = "انتهت الجلسة. أعد تسجيل الدخول.";
        dashboardContainer.innerHTML = "";
        logoutBtn.classList.add("hidden");
        return;
      }
      try {
        user = await request("/api/auth/me/", { auth: true });
      } catch (err) {
        clearSession();
        setStatus(loginStatus, `تعذر التحقق من الجلسة: ${err.message}`);
        return;
      }
    }

    if (user.role === "student") {
      await renderStudentDashboard(user);
      return;
    }
    if (user.role === "teacher" || user.role === "admin") {
      await renderTeacherOrAdminDashboard(user);
      return;
    }
    renderGuardianDashboard(user);
  }

  if (apiBaseInput) {
    apiBaseInput.value = getApiBase();
  }

  if (saveApiBaseBtn) {
    saveApiBaseBtn.addEventListener("click", () => {
      const value = normalizeApiBase(apiBaseInput.value || "");
      if (!value) {
        setStatus(apiStatus, "الرجاء إدخال عنوان خادم صحيح.");
        return;
      }
      localStorage.setItem(API_BASE_KEY, value);
      setStatus(apiStatus, `تم حفظ عنوان الخادم: ${value}`, true);
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(loginStatus, "جاري تسجيل الدخول...", true);
      const username = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value;

      try {
        const data = await request("/api/auth/token/", {
          method: "POST",
          body: { username, password },
        });
        setTokens(data.access, data.refresh);
        setStatus(loginStatus, "تم تسجيل الدخول بنجاح.", true);
        await loadSession();
      } catch (err) {
        setStatus(loginStatus, `فشل تسجيل الدخول: ${err.message}`);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(registerStatus, "جاري إنشاء الحساب...", true);
      const payload = {
        username: document.getElementById("regUsername").value.trim(),
        full_name: document.getElementById("regFullName").value.trim(),
        email: document.getElementById("regEmail").value.trim(),
        phone: document.getElementById("regPhone").value.trim(),
        role: document.getElementById("regRole").value,
        password: document.getElementById("regPassword").value,
      };

      try {
        await request("/api/auth/register/", { method: "POST", body: payload });
        setStatus(registerStatus, "تم إنشاء الحساب. يمكنك تسجيل الدخول الآن.", true);
        registerForm.reset();
      } catch (err) {
        setStatus(registerStatus, `فشل إنشاء الحساب: ${err.message}`);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      sessionInfo.textContent = "تم تسجيل الخروج.";
      dashboardContainer.innerHTML = "";
      logoutBtn.classList.add("hidden");
    });
  }

  loadSession();
})();
