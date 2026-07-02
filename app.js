(function () {
  "use strict";

  var storageKey = "life-cockpit/v1";
  var currentYear = new Date().getFullYear();
  var defaultState = {
    profile: {
      name: "あなた",
      birthDate: "1990-01-01",
      averageAge: 81.06,
      targetAge: 100
    },
    dailyActions: [
      { id: "daily-1", text: "今日いちばん未来に効く30分を先に確保する", done: false }
    ],
    dreams: [
      { id: "dream-1", title: "AIで自分専用の仕事道具を作り続ける", area: "仕事", year: currentYear + 1, progress: 20 },
      { id: "dream-2", title: "健康に動ける体を維持する", area: "健康", year: currentYear + 3, progress: 35 },
      { id: "dream-3", title: "大切な人と行きたい場所へ行く", area: "家族", year: currentYear + 2, progress: 10 }
    ]
  };

  var state = loadState();

  var elements = {
    openSetupButton: document.getElementById("openSetupButton"),
    setupDialog: document.getElementById("setupDialog"),
    profileName: document.getElementById("profileName"),
    birthDate: document.getElementById("birthDate"),
    averageAge: document.getElementById("averageAge"),
    targetAge: document.getElementById("targetAge"),
    currentTime: document.getElementById("currentTime"),
    lifeCountdown: document.getElementById("lifeCountdown"),
    lifeMeter: document.getElementById("lifeMeter"),
    spentPercent: document.getElementById("spentPercent"),
    remainingDays: document.getElementById("remainingDays"),
    remainingWeeks: document.getElementById("remainingWeeks"),
    targetTitle: document.getElementById("targetTitle"),
    targetCountdown: document.getElementById("targetCountdown"),
    todayQuestion: document.getElementById("todayQuestion"),
    dailyForm: document.getElementById("dailyForm"),
    dailyInput: document.getElementById("dailyInput"),
    dailyList: document.getElementById("dailyList"),
    dreamForm: document.getElementById("dreamForm"),
    dreamTitle: document.getElementById("dreamTitle"),
    dreamArea: document.getElementById("dreamArea"),
    dreamYear: document.getElementById("dreamYear"),
    addDreamButton: document.getElementById("addDreamButton"),
    dreamList: document.getElementById("dreamList"),
    timeline: document.getElementById("timeline"),
    timelineCount: document.getElementById("timelineCount"),
    blameInput: document.getElementById("blameInput"),
    reframeButton: document.getElementById("reframeButton"),
    reframeOutput: document.getElementById("reframeOutput"),
    aiPrompt: document.getElementById("aiPrompt"),
    copyPromptButton: document.getElementById("copyPromptButton")
  };

  function loadState() {
    try {
      var saved = window.localStorage.getItem(storageKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        return {
          profile: Object.assign({}, defaultState.profile, parsed.profile || {}),
          dailyActions: parsed.dailyActions || defaultState.dailyActions,
          dreams: parsed.dreams || defaultState.dreams
        };
      }
    } catch (error) {
      return defaultState;
    }
    return defaultState;
  }

  function saveState() {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function uid(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function addYears(date, years) {
    var result = new Date(date.getTime());
    var whole = Math.floor(years);
    var fraction = years - whole;
    result.setFullYear(result.getFullYear() + whole);
    result.setDate(result.getDate() + Math.round(fraction * 365.2425));
    return result;
  }

  function formatDuration(ms) {
    var safeMs = Math.max(0, ms);
    var totalSeconds = Math.floor(safeMs / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var years = Math.floor(days / 365.2425);
    var restDays = Math.floor(days - years * 365.2425);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return years + "年 " + restDays + "日 " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  }

  function numberFormat(value) {
    return new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.floor(value)));
  }

  function getBirthDate() {
    var date = new Date(state.profile.birthDate + "T00:00:00");
    if (Number.isNaN(date.getTime())) {
      return new Date(defaultState.profile.birthDate + "T00:00:00");
    }
    return date;
  }

  function updateClock() {
    var now = new Date();
    var birthDate = getBirthDate();
    var averageEnd = addYears(birthDate, Number(state.profile.averageAge) || 81.06);
    var targetEnd = addYears(birthDate, Number(state.profile.targetAge) || 100);
    var livedMs = now - birthDate;
    var averageLifeMs = averageEnd - birthDate;
    var remainingMs = averageEnd - now;
    var targetRemainingMs = targetEnd - now;
    var spentRatio = Math.min(100, Math.max(0, livedMs / averageLifeMs * 100));

    elements.currentTime.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    elements.lifeCountdown.textContent = formatDuration(remainingMs);
    elements.lifeMeter.style.width = spentRatio.toFixed(2) + "%";
    elements.spentPercent.textContent = spentRatio.toFixed(1) + "%";
    elements.remainingDays.textContent = numberFormat(remainingMs / 86400000);
    elements.remainingWeeks.textContent = numberFormat(remainingMs / 604800000);
    elements.targetTitle.textContent = state.profile.targetAge + "歳まで";
    elements.targetCountdown.textContent = formatDuration(targetRemainingMs).replace(/ \d\d:\d\d:\d\d$/, "");
    elements.todayQuestion.textContent = state.profile.name + "さん、今日、未来の自分に渡す一手は？";
  }

  function syncProfileFields() {
    elements.profileName.value = state.profile.name;
    elements.birthDate.value = state.profile.birthDate;
    elements.averageAge.value = state.profile.averageAge;
    elements.targetAge.value = state.profile.targetAge;
  }

  function bindProfileField(element, key, parser) {
    element.addEventListener("input", function () {
      state.profile[key] = parser ? parser(element.value) : element.value;
      saveState();
      renderAll();
    });
  }

  function renderDailyActions() {
    elements.dailyList.innerHTML = "";
    state.dailyActions.forEach(function (action) {
      var item = document.createElement("li");

      var check = document.createElement("button");
      check.type = "button";
      check.textContent = action.done ? "✓" : "";
      check.setAttribute("aria-label", action.done ? "未完了に戻す" : "完了にする");
      check.addEventListener("click", function () {
        action.done = !action.done;
        saveState();
        renderAll();
      });

      var text = document.createElement("span");
      text.textContent = action.text;
      if (action.done) {
        text.className = "done";
      }

      var remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "削除");
      remove.addEventListener("click", function () {
        state.dailyActions = state.dailyActions.filter(function (itemAction) {
          return itemAction.id !== action.id;
        });
        saveState();
        renderAll();
      });

      item.appendChild(check);
      item.appendChild(text);
      item.appendChild(remove);
      elements.dailyList.appendChild(item);
    });
  }

  function renderDreams() {
    var sortedDreams = state.dreams.slice().sort(function (a, b) {
      return Number(a.year) - Number(b.year);
    });
    elements.dreamList.innerHTML = "";

    sortedDreams.forEach(function (dream) {
      var card = document.createElement("article");
      card.className = "dream-card";

      var title = document.createElement("p");
      title.className = "dream-title";
      title.textContent = dream.title;

      var meta = document.createElement("div");
      meta.className = "dream-meta";

      var left = document.createElement("span");
      left.textContent = dream.year + "年 / " + dream.area;

      var remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "削除";
      remove.addEventListener("click", function () {
        state.dreams = state.dreams.filter(function (item) {
          return item.id !== dream.id;
        });
        saveState();
        renderAll();
      });

      var progress = document.createElement("div");
      progress.className = "progress-line";

      var range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      range.max = "100";
      range.value = dream.progress;
      range.setAttribute("aria-label", dream.title + "の進捗");
      range.addEventListener("input", function () {
        dream.progress = Number(range.value);
        saveState();
        renderAll();
      });

      var percent = document.createElement("strong");
      percent.textContent = dream.progress + "%";

      meta.appendChild(left);
      meta.appendChild(remove);
      progress.appendChild(range);
      progress.appendChild(percent);
      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(progress);
      elements.dreamList.appendChild(card);
    });
  }

  function renderTimeline() {
    var sortedDreams = state.dreams.slice().sort(function (a, b) {
      return Number(a.year) - Number(b.year);
    });
    elements.timeline.innerHTML = "";
    elements.timelineCount.textContent = sortedDreams.length + "件";

    if (!sortedDreams.length) {
      var empty = document.createElement("p");
      empty.className = "setup-note";
      empty.textContent = "夢リストを追加すると、ここに未来年表ができます。";
      elements.timeline.appendChild(empty);
      return;
    }

    sortedDreams.forEach(function (dream) {
      var item = document.createElement("div");
      item.className = "timeline-item";

      var body = document.createElement("div");
      var title = document.createElement("strong");
      title.textContent = dream.year + "年";
      var text = document.createElement("span");
      text.textContent = dream.title;

      var age = document.createElement("span");
      var birthYear = getBirthDate().getFullYear();
      age.textContent = Number(dream.year) - birthYear + "歳 / " + dream.area;

      body.appendChild(title);
      body.appendChild(document.createElement("br"));
      body.appendChild(text);
      item.appendChild(body);
      item.appendChild(age);
      elements.timeline.appendChild(item);
    });
  }

  function renderPrompt() {
    var openDaily = state.dailyActions.filter(function (action) {
      return !action.done;
    }).map(function (action, index) {
      return index + 1 + ". " + action.text;
    }).join("\n");

    var dreams = state.dreams.slice().sort(function (a, b) {
      return Number(a.year) - Number(b.year);
    }).map(function (dream) {
      return "- " + dream.year + "年: " + dream.title + "（" + dream.area + "、進捗" + dream.progress + "%）";
    }).join("\n");

    elements.aiPrompt.value = [
      "あなたは私の人生コックピットの参謀です。",
      "残り時間を意識しつつ、他人の正解ではなく私の意思で動けるようにしてください。",
      "",
      "プロフィール:",
      "- 名前: " + state.profile.name,
      "- 生年月日: " + state.profile.birthDate,
      "- 平均余命として見る年齢: " + state.profile.averageAge,
      "- 目標寿命: " + state.profile.targetAge,
      "",
      "夢リスト:",
      dreams || "まだありません",
      "",
      "今日の一手:",
      openDaily || "まだありません",
      "",
      "依頼:",
      "1. 今日やるべき最重要アクションを1つ選ぶ",
      "2. その理由を短く説明する",
      "3. 15分で始められる最初の行動に分解する",
      "4. 他責になっている表現があれば自責の行動文に直す"
    ].join("\n");
  }

  function renderAll() {
    updateClock();
    renderDailyActions();
    renderDreams();
    renderTimeline();
    renderPrompt();
  }

  function reframeBlame() {
    var text = elements.blameInput.value.trim();
    if (!text) {
      elements.reframeOutput.textContent = "まず、引っかかっている言い訳や不満を1行で書いてください。";
      return;
    }

    var action = "自分が変えられる要素を1つ選び、15分で始める";
    if (text.indexOf("時間がない") !== -1) {
      action = "最初の15分をカレンダーに確保し、その時間だけ着手する";
    } else if (text.indexOf("お金がない") !== -1) {
      action = "無料または小額で試せる実験に分解し、上限予算を決める";
    } else if (text.indexOf("環境が悪い") !== -1) {
      action = "環境の中で今日変えられる条件を1つだけ変える";
    } else if (text.indexOf("できない") !== -1) {
      action = "できる条件を1つ作り、完璧ではなく最初の版を出す";
    } else if (text.indexOf("誰か") !== -1 || text.indexOf("あの人") !== -1) {
      action = "相手待ちにせず、自分から次の確認や提案を出す";
    }

    elements.reframeOutput.textContent = "自責の行動文: 「" + action + "」。今日の最初の一手は、これを15分で始められる形にすること。";
  }

  elements.openSetupButton.addEventListener("click", function () {
    syncProfileFields();
    elements.setupDialog.showModal();
  });

  bindProfileField(elements.profileName, "name");
  bindProfileField(elements.birthDate, "birthDate");
  bindProfileField(elements.averageAge, "averageAge", Number);
  bindProfileField(elements.targetAge, "targetAge", Number);

  elements.dailyForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = elements.dailyInput.value.trim();
    if (!text) {
      return;
    }
    state.dailyActions.unshift({ id: uid("daily"), text: text, done: false });
    elements.dailyInput.value = "";
    saveState();
    renderAll();
  });

  elements.dreamForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var title = elements.dreamTitle.value.trim();
    var year = Number(elements.dreamYear.value) || currentYear + 1;
    if (!title) {
      return;
    }
    state.dreams.push({
      id: uid("dream"),
      title: title,
      area: elements.dreamArea.value,
      year: year,
      progress: 0
    });
    elements.dreamTitle.value = "";
    elements.dreamYear.value = "";
    saveState();
    renderAll();
  });

  elements.addDreamButton.addEventListener("click", function () {
    elements.dreamTitle.focus();
  });

  elements.reframeButton.addEventListener("click", reframeBlame);

  elements.copyPromptButton.addEventListener("click", function () {
    elements.aiPrompt.select();
    navigator.clipboard.writeText(elements.aiPrompt.value).then(function () {
      elements.copyPromptButton.textContent = "コピー済み";
      window.setTimeout(function () {
        elements.copyPromptButton.textContent = "コピー";
      }, 1200);
    });
  });

  syncProfileFields();
  renderAll();
  window.setInterval(updateClock, 1000);
}());
