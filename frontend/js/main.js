/* ============================================================
   Sanskardham Hospital — Shared site scripts
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Sticky header shadow ---------- */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Page banner: smooth upper/lower side reveal on scroll ---------- */
  var banners = document.querySelectorAll(".page-banner");
  if (banners.length) {
    var targetProgress = [];
    var currentProgress = [];
    var rafId = null;

    banners.forEach(function (banner, i) {
      targetProgress[i] = 0;
      currentProgress[i] = 0;
    });

    var updateBannerTargets = function () {
      banners.forEach(function (banner, i) {
        var rect = banner.getBoundingClientRect();
        // 0 = banner sits at the top of the viewport (page upper side),
        // 1 = banner has scrolled fully past the top (page lower side)
        targetProgress[i] = Math.max(0, Math.min(1, -rect.top / rect.height));
      });
      if (rafId === null) rafId = requestAnimationFrame(animateBanners);
    };

    var animateBanners = function () {
      rafId = null;
      var stillAnimating = false;
      banners.forEach(function (banner, i) {
        var target = targetProgress[i];
        currentProgress[i] += (target - currentProgress[i]) * 0.12;
        if (Math.abs(target - currentProgress[i]) < 0.002) {
          currentProgress[i] = target;
        } else {
          stillAnimating = true;
        }
        banner.style.backgroundPositionY = currentProgress[i] * 100 + "%";
      });
      if (stillAnimating) rafId = requestAnimationFrame(animateBanners);
    };

    window.addEventListener("scroll", updateBannerTargets, { passive: true });
    window.addEventListener("resize", updateBannerTargets);
    updateBannerTargets();
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Department "Other" alert ---------- */
  document.querySelectorAll("[data-other-alert]").forEach(function (alert) {
    var select = alert.closest(".form-group").querySelector("select");
    if (!select) return;

    var updateAlert = function () {
      alert.hidden = select.value !== "Other";
    };

    select.addEventListener("change", updateAlert);
    updateAlert();
  });

  /* ---------- Backend API & Storage helpers ---------- */
  var APPOINTMENTS_KEY = "sanskardham_appointments";

  var getApiUrl = function (endpoint) {
    var base = (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL
      : "/api";
    return base.replace(/\/+$/, "") + endpoint;
  };

  var getLocalAppointments = function () {
    try {
      var stored = localStorage.getItem(APPOINTMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      return [];
    }
  };

  var setLocalAppointments = function (list) {
    try {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(list));
    } catch (err) {
      /* storage unavailable */
    }
  };

  var saveAppointment = function (booking) {
    var list = getLocalAppointments();
    booking.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    list.unshift(booking);
    setLocalAppointments(list);

    // Sync with backend API (Render)
    try {
      fetch(getApiUrl("/appointments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking)
      }).catch(function (err) {
        console.warn("Backend unavailable, appointment saved locally:", err);
      });
    } catch (e) {
      /* offline or fetch error */
    }
  };

  /* ---------- Contact / appointment forms ---------- */
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var valid = true;
      form.querySelectorAll("[required]").forEach(function (field) {
        field.style.borderColor = "";
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = "#e11d48";
        } else if (field.type === "tel" && !/^\d{10}$/.test(field.value.trim())) {
          valid = false;
          field.style.borderColor = "#e11d48";
        }
      });

      if (!valid) {
        var firstInvalid = form.querySelector('[required][style*="e11d48"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Save the booking so it syncs to server and shows up on staff appointments page
      var booking = {};
      new FormData(form).forEach(function (value, key) {
        booking[key] = value.trim();
      });
      booking.bookedAt = new Date().toISOString();
      saveAppointment(booking);

      var success = form.querySelector(".form-success");
      if (success) success.classList.add("show");
      form.reset();
    });
  });

  /* ---------- Admin password verification (appointments page) ---------- */
  var adminLogin = document.querySelector("[data-admin-login]");
  var onAdminUnlocked = null;
  if (adminLogin) {
    var adminPassword = adminLogin.getAttribute("data-password") || "admin123";
    var adminPanel = document.querySelector("[data-admin-panel]");
    var passwordInput = adminLogin.querySelector("[data-admin-password]");
    var verifyBtn = adminLogin.querySelector("[data-admin-verify]");
    var errorEl = adminLogin.querySelector("[data-admin-error]");
    var logoutBtn = adminPanel ? adminPanel.querySelector("[data-admin-logout]") : null;
    var SESSION_KEY = "sanskardham_admin_verified";

    var showAdminPanel = function () {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch (err) {
        /* storage unavailable */
      }
      if (adminPanel) adminPanel.hidden = false;
      adminLogin.hidden = true;
      if (passwordInput) passwordInput.value = "";
      if (onAdminUnlocked) onAdminUnlocked();
    };

    var showAdminLogin = function () {
      if (adminPanel) adminPanel.hidden = true;
      adminLogin.hidden = false;
    };

    var alreadyVerified = false;
    try {
      alreadyVerified = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (err) {
      /* ignore */
    }
    if (alreadyVerified) showAdminPanel();

    if (verifyBtn) {
      verifyBtn.addEventListener("click", function () {
        var entered = passwordInput ? passwordInput.value : "";
        if (!entered) return;

        verifyBtn.disabled = true;
        var originalText = verifyBtn.textContent;
        verifyBtn.textContent = "Verifying...";

        // Verify with backend first, with local fallback
        fetch(getApiUrl("/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: entered })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          verifyBtn.disabled = false;
          verifyBtn.textContent = originalText;
          if (data && data.success) {
            if (errorEl) errorEl.hidden = true;
            showAdminPanel();
          } else {
            if (errorEl) {
              errorEl.textContent = data.message || "Incorrect password. Please try again.";
              errorEl.hidden = false;
            }
            if (passwordInput) {
              passwordInput.focus();
              passwordInput.select();
            }
          }
        })
        .catch(function () {
          // Backend unreachable: fallback to local check
          verifyBtn.disabled = false;
          verifyBtn.textContent = originalText;
          if (entered === adminPassword) {
            if (errorEl) errorEl.hidden = true;
            showAdminPanel();
          } else {
            if (errorEl) {
              errorEl.textContent = "Incorrect password. Please try again.";
              errorEl.hidden = false;
            }
            if (passwordInput) {
              passwordInput.focus();
              passwordInput.select();
            }
          }
        });
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          if (verifyBtn) verifyBtn.click();
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch (err) {
          /* ignore */
        }
        showAdminLogin();
      });
    }

    /* ---------- Change password ---------- */
    var PASSWORD_STORAGE_KEY = "sanskardham_admin_password";
    var changePwdBtn = document.querySelector("[data-change-password-btn]");
    var changePwdForm = document.querySelector("[data-change-password-form]");
    var currentPwdInput = document.querySelector("[data-current-password]");
    var newPwdInput = document.querySelector("[data-new-password]");
    var confirmPwdInput = document.querySelector("[data-confirm-password]");
    var savePwdBtn = document.querySelector("[data-save-password]");
    var cancelPwdBtn = document.querySelector("[data-cancel-password]");
    var pwdError = document.querySelector("[data-password-error]");
    var pwdSuccess = document.querySelector("[data-password-success]");

    // Load saved password from localStorage on startup
    var savedPassword = null;
    try {
      savedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY);
    } catch (err) { /* ignore */ }
    if (savedPassword) {
      adminPassword = savedPassword;
      adminLogin.setAttribute("data-password", savedPassword);
    }

    if (changePwdBtn && changePwdForm) {
      changePwdBtn.addEventListener("click", function () {
        changePwdForm.hidden = !changePwdForm.hidden;
        if (!changePwdForm.hidden && pwdError) pwdError.hidden = true;
        if (!changePwdForm.hidden && pwdSuccess) pwdSuccess.hidden = true;
        if (currentPwdInput) currentPwdInput.value = "";
        if (newPwdInput) newPwdInput.value = "";
        if (confirmPwdInput) confirmPwdInput.value = "";
      });
    }

    if (cancelPwdBtn && changePwdForm) {
      cancelPwdBtn.addEventListener("click", function () {
        changePwdForm.hidden = true;
      });
    }

    if (savePwdBtn) {
      savePwdBtn.addEventListener("click", function () {
        var currentVal = currentPwdInput ? currentPwdInput.value.trim() : "";
        var newVal = newPwdInput ? newPwdInput.value.trim() : "";
        var confirmVal = confirmPwdInput ? confirmPwdInput.value.trim() : "";

        if (pwdError) pwdError.hidden = true;
        if (pwdSuccess) pwdSuccess.hidden = true;

        if (!currentVal || !newVal || !confirmVal) {
          if (pwdError) { pwdError.textContent = "Please fill in all fields."; pwdError.hidden = false; }
          return;
        }

        if (newVal.length < 4) {
          if (pwdError) { pwdError.textContent = "New password must be at least 4 characters."; pwdError.hidden = false; }
          if (newPwdInput) { newPwdInput.focus(); newPwdInput.select(); }
          return;
        }

        if (newVal !== confirmVal) {
          if (pwdError) { pwdError.textContent = "New password and confirmation do not match."; pwdError.hidden = false; }
          if (confirmPwdInput) { confirmPwdInput.focus(); confirmPwdInput.select(); }
          return;
        }

        savePwdBtn.disabled = true;
        savePwdBtn.textContent = "Saving...";

        // Send to backend API
        fetch(getApiUrl("/auth/change-password"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: currentVal, newPassword: newVal })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          savePwdBtn.disabled = false;
          savePwdBtn.textContent = "Save New Password";

          if (data && data.success) {
            adminPassword = newVal;
            adminLogin.setAttribute("data-password", newVal);
            try { localStorage.setItem(PASSWORD_STORAGE_KEY, newVal); } catch (e) {}

            if (pwdSuccess) {
              pwdSuccess.textContent = "Password changed successfully!";
              pwdSuccess.hidden = false;
            }
            if (pwdError) pwdError.hidden = true;
            if (currentPwdInput) currentPwdInput.value = "";
            if (newPwdInput) newPwdInput.value = "";
            if (confirmPwdInput) confirmPwdInput.value = "";

            setTimeout(function () {
              if (changePwdForm) changePwdForm.hidden = true;
              if (pwdSuccess) pwdSuccess.hidden = true;
            }, 2000);
          } else {
            if (pwdError) {
              pwdError.textContent = (data && data.message) || "Failed to update password.";
              pwdError.hidden = false;
            }
          }
        })
        .catch(function () {
          // Fallback if backend is not reachable
          savePwdBtn.disabled = false;
          savePwdBtn.textContent = "Save New Password";

          if (currentVal !== adminPassword) {
            if (pwdError) { pwdError.textContent = "Current password is incorrect."; pwdError.hidden = false; }
            return;
          }

          adminPassword = newVal;
          adminLogin.setAttribute("data-password", newVal);
          try { localStorage.setItem(PASSWORD_STORAGE_KEY, newVal); } catch (e) {}

          if (pwdSuccess) {
            pwdSuccess.textContent = "Password changed locally.";
            pwdSuccess.hidden = false;
          }
          if (pwdError) pwdError.hidden = true;
          if (currentPwdInput) currentPwdInput.value = "";
          if (newPwdInput) newPwdInput.value = "";
          if (confirmPwdInput) confirmPwdInput.value = "";

          setTimeout(function () {
            if (changePwdForm) changePwdForm.hidden = true;
            if (pwdSuccess) pwdSuccess.hidden = true;
          }, 2000);
        });
      });
    }
  }

  /* ---------- Password show/hide toggle ---------- */
  document.querySelectorAll("[data-password-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = btn.closest(".password-field").querySelector("input");
      if (!input) return;
      var isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.querySelector(".eye-open").style.display = isPassword ? "none" : "";
      btn.querySelector(".eye-closed").style.display = isPassword ? "" : "none";
      btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
  });

  /* ---------- Appointments admin page ---------- */
  var adminBody = document.querySelector("[data-appointments-body]");
  if (adminBody) {
    var countEl = document.querySelector("[data-appointments-count]");
    var emptyEl = document.querySelector("[data-appointments-empty]");
    var tableWrap = adminBody.closest(".table-wrap");
    var clearBtn = document.querySelector("[data-appointments-clear]");

    var formatDateTime = function (iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "\u2014";
      return d.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    };

    var renderList = function (list) {
      adminBody.innerHTML = "";

      if (countEl) {
        countEl.textContent =
          list.length + (list.length === 1 ? " appointment" : " appointments");
      }
      if (emptyEl) emptyEl.hidden = list.length > 0;
      if (tableWrap) tableWrap.hidden = list.length === 0;
      if (clearBtn) clearBtn.disabled = list.length === 0;

      list.forEach(function (booking, index) {
        var tr = document.createElement("tr");

        var addCell = function (value, tagName) {
          var cell = document.createElement("td");
          if (tagName) {
            var el = document.createElement(tagName);
            el.textContent = value || "\u2014";
            cell.appendChild(el);
          } else {
            cell.textContent = value || "\u2014";
          }
          tr.appendChild(cell);
          return cell;
        };

        addCell(String(index + 1));
        addCell(booking.name);
        var phoneCell = addCell(booking.phone, "a");
        phoneCell.querySelector("a").href = "tel:" + (booking.phone || "");
        addCell(booking.department);
        addCell(booking.date);
        addCell(booking.message);
        addCell(formatDateTime(booking.bookedAt));

        var actionCell = document.createElement("td");
        var actions = document.createElement("div");
        actions.className = "confirm-actions";

        if (booking.status === "confirmed") {
          var confirmedMsg = document.createElement("div");
          confirmedMsg.className = "confirm-msg confirm-msg--success";
          confirmedMsg.textContent = "Appointment confirmed";
          actionCell.appendChild(confirmedMsg);
        } else if (booking.status === "rejected") {
          var rejectedMsg = document.createElement("div");
          rejectedMsg.className = "confirm-msg confirm-msg--info";
          rejectedMsg.textContent = "Sorry your department is not available in our Hospital";
          actionCell.appendChild(rejectedMsg);
        } else {
          var yesBtn = document.createElement("button");
          yesBtn.type = "button";
          yesBtn.className = "btn btn--yes btn--sm";
          yesBtn.textContent = "Yes";

          var noBtn = document.createElement("button");
          noBtn.type = "button";
          noBtn.className = "btn btn--no btn--sm";
          noBtn.textContent = "No";

          actions.appendChild(yesBtn);
          actions.appendChild(noBtn);
          actionCell.appendChild(actions);

          var updateStatus = function (newStatus) {
            booking.status = newStatus;
            var all = getLocalAppointments();
            for (var i = 0; i < all.length; i++) {
              if (all[i].id === booking.id) {
                all[i].status = newStatus;
                break;
              }
            }
            setLocalAppointments(all);
            renderList(all);

            // Sync with backend
            fetch(getApiUrl("/appointments/" + encodeURIComponent(booking.id) + "/status"), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus })
            }).catch(function (err) {
              console.warn("Status update failed on server:", err);
            });
          };

          yesBtn.addEventListener("click", function () {
            updateStatus("confirmed");
          });

          noBtn.addEventListener("click", function () {
            updateStatus("rejected");
          });
        }

        tr.appendChild(actionCell);
        adminBody.appendChild(tr);
      });
    };

    var renderAppointments = function () {
      // First render local data immediately
      var localList = getLocalAppointments();
      renderList(localList);

      // Then fetch latest data from backend server
      fetch(getApiUrl("/appointments"))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.success && Array.isArray(data.appointments)) {
            setLocalAppointments(data.appointments);
            renderList(data.appointments);
          } else if (Array.isArray(data)) {
            setLocalAppointments(data);
            renderList(data);
          }
        })
        .catch(function (err) {
          console.warn("Using offline/local appointments:", err);
        });
    };

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (window.confirm("Delete all booked appointments?")) {
          setLocalAppointments([]);
          renderList([]);

          // Sync clear with backend
          fetch(getApiUrl("/appointments"), {
            method: "DELETE"
          }).catch(function (err) {
            console.warn("Backend clear failed:", err);
          });
        }
      });
    }

    onAdminUnlocked = renderAppointments;

    var panelVisible = !adminLogin || !adminPanel || !adminPanel.hidden;
    if (panelVisible) renderAppointments();
  }

  /* ---------- Rating summary progress bars ---------- */
  var ratingRows = document.querySelectorAll(".rating-summary__bars .bar-row");
  if (ratingRows.length) {
    var getPercent = function (row) {
      var spans = row.querySelectorAll("span");
      var pctSpan = spans[spans.length - 1];
      var pct = parseFloat(pctSpan ? pctSpan.textContent : "");
      return isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
    };

    var setBarWidth = function (row, width) {
      var fill = row.querySelector(".fill");
      if (fill) fill.style.width = width + "%";
    };

    var syncRatingBars = function () {
      ratingRows.forEach(function (row) {
        setBarWidth(row, getPercent(row));
      });
    };

    // Animate on load: start at 0, then fill to each bar's percentage
    ratingRows.forEach(function (row) {
      setBarWidth(row, 0);
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(syncRatingBars);
    });

    // Keep the green line synchronized with the percentage text
    var observer = new MutationObserver(syncRatingBars);
    ratingRows.forEach(function (row) {
      var spans = row.querySelectorAll("span");
      var pctSpan = spans[spans.length - 1];
      if (pctSpan) {
        observer.observe(pctSpan, { characterData: true, childList: true, subtree: true });
      }
    });
  }

  /* ---------- Navbar advertisement strip carousel ---------- */
  document.querySelectorAll(".ad-strip").forEach(function (strip) {
    var slides = strip.querySelectorAll(".ad-strip__slide");
    var dotsBox = strip.querySelector(".ad-strip__dots");
    var current = 0;
    var timer = null;

    slides.forEach(function (slide, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Go to advertisement " + (i + 1));
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", function () {
        goTo(i);
        restart();
      });
      dotsBox.appendChild(dot);
    });
    var dots = dotsBox.querySelectorAll("button");

    function goTo(index) {
      slides[current].classList.remove("active");
      dots[current].classList.remove("active");
      current = (index + slides.length) % slides.length;
      slides[current].classList.add("active");
      dots[current].classList.add("active");
    }

    function restart() {
      clearInterval(timer);
      timer = setInterval(function () {
        goTo(current + 1);
      }, 4000);
    }

    var prevBtn = strip.querySelector(".ad-strip__arrow--prev");
    var nextBtn = strip.querySelector(".ad-strip__arrow--next");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(current - 1);
        restart();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(current + 1);
        restart();
      });
    }

    strip.addEventListener("mouseenter", function () {
      clearInterval(timer);
    });
    strip.addEventListener("mouseleave", restart);

    restart();
  });
})();
