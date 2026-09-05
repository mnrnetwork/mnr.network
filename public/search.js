(function () {
  let searchIndex = null;
  let isLoading = false;
  let selectedIndex = -1;
  let currentResults = [];

  // DOM elements
  let modalEl = null;
  let inputEl = null;
  let resultsEl = null;
  let suggestedEl = null;

  async function loadSearchIndex() {
    if (searchIndex || isLoading) return;
    isLoading = true;
    try {
      const res = await fetch('/search-index.json');
      if (res.ok) {
        searchIndex = await res.json();
      }
    } catch (e) {
      console.error('Failed to load search index', e);
    } finally {
      isLoading = false;
    }
  }

  function createSearchModal() {
    if (document.getElementById('search-modal')) {
      modalEl = document.getElementById('search-modal');
      inputEl = document.getElementById('search-input');
      resultsEl = document.getElementById('search-results');
      suggestedEl = document.getElementById('search-suggested');
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'search-modal';
    backdrop.className = 'search-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Documentation search');
    backdrop.style.display = 'none';

    backdrop.innerHTML = `
      <div class="search-modal-container">
        <div class="search-input-wrap">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input id="search-input" class="search-input" type="search" placeholder="Search docs, wallets, RPC methods, errors..." autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="search-results">
          <button id="search-close-btn" class="search-close-btn" type="button" title="Close (Esc)" aria-label="Close search">esc</button>
        </div>
        <div id="search-suggested" class="search-suggested">
          <span class="search-suggested-label">Quick:</span>
          <button type="button" class="search-chip" data-query="Feather">Feather</button>
          <button type="button" class="search-chip" data-query="Cake Wallet">Cake</button>
          <button type="button" class="search-chip" data-query="Monero GUI">GUI</button>
          <button type="button" class="search-chip" data-query="Monerujo">Monerujo</button>
          <button type="button" class="search-chip" data-query="Ripley">Ripley</button>
          <button type="button" class="search-chip" data-query="CLI">CLI</button>
          <button type="button" class="search-chip" data-query="Tor">Tor / .onion</button>
          <button type="button" class="search-chip" data-query="get_block">get_block</button>
          <button type="button" class="search-chip" data-query="Free Tier">Tokens</button>
        </div>
        <div id="search-results" class="search-results-list" role="listbox"></div>
        <div class="search-modal-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    modalEl = backdrop;
    inputEl = document.getElementById('search-input');
    resultsEl = document.getElementById('search-results');
    suggestedEl = document.getElementById('search-suggested');

    // Close button
    const closeBtn = document.getElementById('search-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    // Backdrop click
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeSearch();
    });

    // Chips click
    suggestedEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.search-chip');
      if (chip && chip.dataset.query) {
        inputEl.value = chip.dataset.query;
        handleSearch(chip.dataset.query);
        inputEl.focus();
      }
    });

    // Input events
    inputEl.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectCurrentItem();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      }
    });
  }

  function openSearch() {
    createSearchModal();
    loadSearchIndex();
    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    selectedIndex = -1;
    inputEl.value = '';
    renderDefaultResults();
    setTimeout(() => inputEl.focus(), 10);
  }

  function closeSearch() {
    if (!modalEl) return;
    modalEl.style.display = 'none';
    document.body.style.overflow = '';
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function highlightMatch(text, query) {
    if (!query || !text) return escapeHtml(text);
    const safeText = escapeHtml(text);
    const words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return safeText;
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return safeText.replace(regex, '<mark>$1</mark>');
  }

  function renderDefaultResults() {
    if (!searchIndex || !searchIndex.length) {
      resultsEl.innerHTML = `
        <div class="search-empty">
          Type to search documentation, wallets, RPC methods, and plans...
        </div>
      `;
      return;
    }
    // Show top featured items initially (wallets and core guides)
    const featured = searchIndex.filter(item => item.featured || item.category === 'Wallets' || item.category === 'Guide').slice(0, 7);
    renderResultsList(featured, '');
  }

  function handleSearch(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    if (!query) {
      renderDefaultResults();
      return;
    }

    if (!searchIndex) {
      resultsEl.innerHTML = `<div class="search-empty">Loading documentation index...</div>`;
      return;
    }

    const tokens = query.split(/\s+/).filter(Boolean);
    const scored = [];

    for (const item of searchIndex) {
      let score = 0;
      const titleLower = (item.title || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      const kwLower = (item.keywords || []).join(' ').toLowerCase();

      for (const t of tokens) {
        if (titleLower === t) score += 120;
        else if (titleLower.startsWith(t)) score += 80;
        else if (titleLower.includes(t)) score += 50;

        if (catLower.includes(t)) score += 40;
        if (kwLower.includes(t)) score += 35;
        if (descLower.includes(t)) score += 15;
      }

      if (score > 0) {
        scored.push({ item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const topItems = scored.slice(0, 9).map(s => s.item);

    renderResultsList(topItems, query);
  }

  function renderResultsList(items, query) {
    currentResults = items;
    selectedIndex = items.length > 0 ? 0 : -1;

    if (!items.length) {
      resultsEl.innerHTML = `
        <div class="search-empty">
          No documentation matches found for "<strong>${escapeHtml(query)}</strong>".
        </div>
      `;
      return;
    }

    resultsEl.innerHTML = items.map((item, idx) => `
      <a href="${item.route}" class="search-item ${idx === 0 ? 'selected' : ''}" data-index="${idx}" role="option" aria-selected="${idx === 0}">
        <div class="search-item-main">
          <span class="search-item-title">${highlightMatch(item.title, query)}</span>
          <span class="search-item-desc">${highlightMatch(item.description || item.route, query)}</span>
        </div>
        <span class="search-item-badge">${escapeHtml(item.category || 'Docs')}</span>
      </a>
    `).join('');

    // Click handler for items
    resultsEl.querySelectorAll('.search-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const idx = Number(el.dataset.index);
        updateSelection(idx);
      });
    });
  }

  function moveSelection(step) {
    if (!currentResults.length) return;
    const newIdx = selectedIndex + step;
    if (newIdx < 0) {
      updateSelection(currentResults.length - 1);
    } else if (newIdx >= currentResults.length) {
      updateSelection(0);
    } else {
      updateSelection(newIdx);
    }
  }

  function updateSelection(idx) {
    selectedIndex = idx;
    const items = resultsEl.querySelectorAll('.search-item');
    items.forEach((item, i) => {
      const isSelected = i === selectedIndex;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function selectCurrentItem() {
    if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
      const item = currentResults[selectedIndex];
      if (item && item.route) {
        window.location.href = item.route;
      }
    }
  }

  // Global keybindings
  document.addEventListener('keydown', (e) => {
    // Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (modalEl && modalEl.style.display !== 'none') {
        closeSearch();
      } else {
        openSearch();
      }
      return;
    }

    // '/' key when not in an input
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
      return;
    }
  });

  // Bind trigger buttons when DOM is loaded
  function bindTriggers() {
    document.querySelectorAll('.search-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openSearch();
      });
      btn.addEventListener('mouseenter', loadSearchIndex);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTriggers);
  } else {
    bindTriggers();
  }

  // Expose global open method if needed
  window.__mnrOpenSearch = openSearch;
})();
