// Side notes for references. Kramdown renders a footnote reference as
// <sup role="doc-noteref"><a href="#fn:N" class="footnote">N</a></sup> and the
// note as <li id="fn:N"> in the endnotes list. Clicking a reference shows a copy
// of its note beside the citing paragraph (wide screens) or right under it
// (narrow screens) instead of jumping to the list. The list stays for no-JS.
(() => {
  const WIDE_MIN = 1200;      // viewport width from which the note goes in the margin
  const NOTE_WIDTH = 260;     // preferred margin note width in px
  const NOTE_MIN = 180;       // narrowest margin note before falling back inline
  const GAP = 32;             // gap between the column and the note

  function noteIdFor(href) {
    const m = /#(fn:[^#]+)$/.exec(href || '');
    return m ? m[1] : null;
  }

  function placement(viewportWidth) {
    return viewportWidth >= WIDE_MIN ? 'wide' : 'inline';
  }

  // The block that cites the reference: paragraph, list item, quote or heading.
  function citingBlock(el) {
    let n = el && el.parentElement;
    while (n) {
      if (/^(P|LI|BLOCKQUOTE|H[1-6])$/.test(n.tagName)) return n;
      n = n.parentElement;
    }
    return null;
  }

  function init(doc, win) {
    const post = doc.querySelector('.post');
    if (!post) return;
    const refs = Array.from(post.querySelectorAll('a.footnote[href*="#fn:"]'));
    if (!refs.length) return;
    post.classList.add('has-sidenotes');

    let aside = null, activeRef = null;

    function close() {
      if (aside) aside.remove();
      aside = null;
      if (activeRef) activeRef.classList.remove('is-active');
      activeRef = null;
    }

    function place() {
      const block = citingBlock(activeRef);
      if (!aside || !block) return;
      const margin = win.innerWidth - post.getBoundingClientRect().right - GAP;
      if (placement(win.innerWidth) === 'wide' && margin >= NOTE_MIN) {
        aside.classList.add('sidenote--wide');
        aside.style.width = `${Math.min(NOTE_WIDTH, margin)}px`;
        aside.style.top = `${block.offsetTop}px`;
        if (aside.parentElement !== post) post.appendChild(aside);
      } else {
        aside.classList.remove('sidenote--wide');
        aside.style.width = '';
        aside.style.top = '';
        if (aside.previousElementSibling !== block) block.insertAdjacentElement('afterend', aside);
      }
    }

    function open(ref) {
      const note = doc.getElementById(noteIdFor(ref.getAttribute('href')) || '');
      if (!note || !citingBlock(ref)) return false;
      close();
      aside = doc.createElement('aside');
      aside.className = 'sidenote';
      aside.setAttribute('role', 'note');
      aside.setAttribute('aria-label', `Reference ${ref.textContent.trim()}`);
      const number = doc.createElement('span');
      number.className = 'sidenote-number';
      number.textContent = ref.textContent.trim();
      const body = doc.createElement('div');
      body.className = 'sidenote-body';
      body.innerHTML = note.innerHTML;
      body.querySelectorAll('.reversefootnote').forEach((a) => a.remove());
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'sidenote-close';
      button.setAttribute('aria-label', 'Close reference');
      button.textContent = '×';
      button.addEventListener('click', close);
      aside.append(number, body, button);
      activeRef = ref;
      ref.classList.add('is-active');
      place();
      return true;
    }

    refs.forEach((ref) => ref.addEventListener('click', (event) => {
      if (ref === activeRef) { event.preventDefault(); close(); return; }
      if (open(ref)) event.preventDefault();     // otherwise fall back to the jump
    }));
    doc.addEventListener('keydown', (event) => { if (event.key === 'Escape' && aside) close(); });
    doc.addEventListener('click', (event) => {
      if (!aside) return;
      if (aside.contains(event.target) || refs.some((r) => r.contains(event.target))) return;
      close();
    });
    win.addEventListener('resize', place, { passive: true });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { noteIdFor, placement, citingBlock, WIDE_MIN };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
