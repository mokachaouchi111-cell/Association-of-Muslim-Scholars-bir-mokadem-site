(() => {
  const ACCESS_KEY = "portal_access_token";
  const REFRESH_KEY = "portal_refresh_token";
  const API_BASE_KEY = "portal_api_base";
  const DEFAULT_API_BASE = "https://association-api-2f1t.onrender.com";

  const loginForm = document.getElementById("loginForm");
  const loginStatus = document.getElementById("loginStatus");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");

  const registerForm = document.getElementById("registerForm");
  const registerStatus = document.getElementById("registerStatus");
  const registerSubmitBtn = document.getElementById("registerSubmitBtn");

  const regNextBtn = document.getElementById("regNextBtn");
  const regBackBtn = document.getElementById("regBackBtn");
  const regEmailInput = document.getElementById("regEmail");
  const regEmailField = document.getElementById("regEmailField");
  const regEmailIndicator = document.getElementById("regEmailIndicator");
  const regPasswordInput = document.getElementById("regPassword");
  const regPasswordField = document.getElementById("regPasswordField");
  const regPasswordIndicator = document.getElementById("regPasswordIndicator");
  const regRoleInput = document.getElementById("regRole");
  const roleCards = Array.from(document.querySelectorAll(".role-card"));
  const stepPanels = Array.from(document.querySelectorAll(".portal-step"));
  const stepDots = Array.from(document.querySelectorAll("[data-step-dot]"));

  const sessionInfo = document.getElementById("sessionInfo");
  const dashboardContainer = document.getElementById("dashboardContainer");
  const logoutBtn = document.getElementById("logoutBtn");

  let currentStep = 1;

  const getApiBase = () => {
    const base = localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
    return base.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  };
  const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
  const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const setStatus = (el, msg, ok = false) => {
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "#1f7a4a" : "#a03030";
  };

  const setIndicatorState = (field, indicator, state) => {
    if (!field || !indicator) return;
    field.classList.remove("is-valid", "is-invalid");
    indicator.textContent = "";
    if (state === "valid") {
      field.classList.add("is-valid");
      indicator.textContent = "✓";
    } else if (state === "invalid") {
      field.classList.add("is-invalid");
      indicator.textContent = "✕";
    }
  };

  const setButtonLoading = (btn, loading) => {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);
  };

  const setTokens = (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  };

  const clearSession = () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  const goToStep = (stepNumber) => {
    currentStep = stepNumber;
    stepPanels.forEach((panel) => {
      const panelStep = Number(panel.dataset.step || "1");
      panel.classList.toggle("active", panelStep === stepNumber);
    });
    stepDots.forEach((dot) => {
      const dotStep = Number(dot.dataset.stepDot || "1");
      dot.classList.toggle("active", dotStep === stepNumber);
      dot.classList.toggle("done", dotStep < stepNumber);
    });
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

  if (!localStorage.getItem(API_BASE_KEY)) {
    localStorage.setItem(API_BASE_KEY, DEFAULT_API_BASE);
  }

  roleCards.forEach((card) => {
    card.addEventListener("click", () => {
      roleCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      if (regRoleInput) {
        regRoleInput.value = card.dataset.role || "student";
      }
    });
  });

  regEmailInput?.addEventListener("blur", () => {
    if (!regEmailInput.value.trim()) {
      setIndicatorState(regEmailField, regEmailIndicator, "");
      return;
    }
    setIndicatorState(
      regEmailField,
      regEmailIndicator,
      isValidEmail(regEmailInput.value.trim()) ? "valid" : "invalid"
    );
  });

  regPasswordInput?.addEventListener("blur", () => {
    if (!regPasswordInput.value) {
      setIndicatorState(regPasswordField, regPasswordIndicator, "");
      return;
    }
    setIndicatorState(
      regPasswordField,
      regPasswordIndicator,
      regPasswordInput.value.length >= 6 ? "valid" : "invalid"
    );
  });

  regNextBtn?.addEventListener("click", () => {
    const username = document.getElementById("regUsername").value.trim();
    const fullName = document.getElementById("regFullName").value.trim();
    const email = regEmailInput.value.trim();

    if (!username || !fullName || !email) {
      setStatus(registerStatus, "يرجى ملء كل الحقول في الخطوة الأولى.");
      return;
    }
    if (!isValidEmail(email)) {
      setIndicatorState(regEmailField, regEmailIndicator, "invalid");
      setStatus(registerStatus, "صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }

    setIndicatorState(regEmailField, regEmailIndicator, "valid");
    setStatus(registerStatus, "", true);
    goToStep(2);
  });

  regBackBtn?.addEventListener("click", () => {
    setStatus(registerStatus, "");
    goToStep(1);
  });

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setButtonLoading(loginSubmitBtn, true);
      setStatus(loginStatus, "جارٍ تسجيل الدخول...", true);

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
      } finally {
        setButtonLoading(loginSubmitBtn, false);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const username = document.getElementById("regUsername").value.trim();
      const fullName = document.getElementById("regFullName").value.trim();
      const email = regEmailInput.value.trim();
      const role = regRoleInput.value || "student";
      const password = regPasswordInput.value;

      if (!username || !fullName || !email || !password) {
        setStatus(registerStatus, "يرجى إكمال جميع الحقول المطلوبة.");
        return;
      }
      if (!isValidEmail(email)) {
        setIndicatorState(regEmailField, regEmailIndicator, "invalid");
        setStatus(registerStatus, "البريد الإلكتروني يجب أن يحتوي على @ وبصيغة صحيحة.");
        return;
      }
      if (password.length < 6) {
        setIndicatorState(regPasswordField, regPasswordIndicator, "invalid");
        setStatus(registerStatus, "كلمة المرور يجب ألا تقل عن 6 أحرف.");
        return;
      }

      setIndicatorState(regEmailField, regEmailIndicator, "valid");
      setIndicatorState(regPasswordField, regPasswordIndicator, "valid");

      setButtonLoading(registerSubmitBtn, true);
      setStatus(registerStatus, "جارٍ إنشاء الحساب...", true);

      try {
        await request("/api/auth/register/", {
          method: "POST",
          body: {
            username,
            full_name: fullName,
            email,
            role,
            password,
          },
        });
        registerForm.reset();
        if (regRoleInput) regRoleInput.value = "student";
        roleCards.forEach((c) => c.classList.remove("active"));
        roleCards[0]?.classList.add("active");
        setIndicatorState(regEmailField, regEmailIndicator, "");
        setIndicatorState(regPasswordField, regPasswordIndicator, "");
        setStatus(registerStatus, "تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.", true);
        goToStep(1);
        document.getElementById("loginUsername")?.focus();
      } catch (err) {
        setStatus(registerStatus, `فشل إنشاء الحساب: ${err.message}`);
      } finally {
        setButtonLoading(registerSubmitBtn, false);
      }
    });
  }

  logoutBtn?.addEventListener("click", () => {
    clearSession();
    sessionInfo.textContent = "تم تسجيل الخروج.";
    dashboardContainer.innerHTML = "";
    logoutBtn.classList.add("hidden");
  });

  goToStep(1);
  loadSession();
})();
