(function () {
  const target = window.HARNESS_TARGET;
  const sourcePath = target === 'dashboard' ? '/dashboard.html' : '/popup.html';
  const frame = document.getElementById('previewFrame');
  const logEl = document.getElementById('log');

  const state = {
    isTracking: true,
    pageCredibility: 5.2,
    pageCategory: 'news',
    pageBias: 'left',
    pageTone: 'neutral',
    credibilityLoad: 64,
    guidanceMode: 'standard',
    sameStoryEligible: true,
    weekly: {
      visitsCount: 28,
      domainsCount: 8,
      categoryFocus: 'balanced',
      biasFocus: 'balanced',
      toneFocus: 'neutral',
      baseCredibility: 6.4
    },
    scores: {
      overallHealth: 6.8,
      contentBalance: 6.4,
      sourceDiversity: 7.2,
      timeManagement: 6.0,
      contentTone: 6.3,
      politicalBalance: 6.1
    }
  };

  function log(msg, payload) {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.textContent += payload ? `${line} ${JSON.stringify(payload)}\n` : `${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function safeStateJson() {
    return JSON.stringify(state).replace(/</g, '\\u003c');
  }

  async function renderFrame() {
    const html = await fetch(sourcePath).then(r => r.text());
    const withBase = html.replace('<head>', `<head><base href="${window.location.origin}/">`);
    const injected = withBase.replace(
      '</head>',
      `<script>window.__HARNESS_STATE__=${safeStateJson()};</script><script src="/tests/harness/runtime-mock.js"></script></head>`
    );
    frame.srcdoc = injected;
    log('render', { target, sourcePath });
  }

  function bindInputs() {
    const ids = [
      'overallHealth', 'sourceDiversity', 'contentTone', 'politicalBalance',
      'pageCredibility', 'credibilityLoad', 'visitsCount', 'domainsCount'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        const value = Number(el.value);
        if (['overallHealth', 'sourceDiversity', 'contentTone', 'politicalBalance'].includes(id)) {
          state.scores[id] = value;
        } else if (id === 'pageCredibility') state.pageCredibility = value;
        else if (id === 'credibilityLoad') state.credibilityLoad = value;
        else if (id === 'visitsCount') state.weekly.visitsCount = value;
        else if (id === 'domainsCount') state.weekly.domainsCount = value;
      });
    });

    const selectMap = {
      guidanceMode: ['guidanceMode'],
      pageCategory: ['pageCategory'],
      pageBias: ['pageBias'],
      pageTone: ['pageTone'],
      categoryFocus: ['weekly', 'categoryFocus'],
      biasFocus: ['weekly', 'biasFocus'],
      toneFocus: ['weekly', 'toneFocus'],
      sameStoryEligible: ['sameStoryEligible']
    };

    Object.keys(selectMap).forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('change', () => {
        const path = selectMap[id];
        const value = id === 'sameStoryEligible' ? el.value === 'true' : el.value;
        if (path.length === 1) state[path[0]] = value;
        else state[path[0]][path[1]] = value;
      });
    });

    document.getElementById('applyBtn').addEventListener('click', renderFrame);
    document.getElementById('resetBtn').addEventListener('click', () => {
      location.reload();
    });
  }

  function bindLiveReload() {
    const evt = new EventSource('/__events');
    evt.addEventListener('reload', () => {
      log('live-reload');
      location.reload();
    });
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'harness-log') {
      log(event.data.message, event.data.payload);
    }
  });

  bindInputs();
  bindLiveReload();
  renderFrame();
})();
