// Side notes for references. Kramdown renders a footnote reference as
// <sup role="doc-noteref"><a href="#fn:N" class="footnote">N</a></sup> and the
// note as <li id="fn:N"> in the endnotes list. Clicking a reference shows a copy
// of its note beside the citing paragraph (wide screens) or on the row right
// under the citing line (narrow screens) instead of jumping to the list. The
// list stays for no-JS.
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

  // Index of the first word box that starts below the reference, i.e. on the
  // next line; -1 when the reference sits on the block's last line.
  function nextLineIndex(tops, refBottom) {
    return tops.findIndex((top) => top >= refBottom);
  }

  // Where the inline note goes so it opens on the row under the citing line:
  // { node, offset } to split a text node there, { before } to insert ahead of
  // an inline element, or null to fall back to after the block.
  function lineBreakTarget(doc, block, ref) {
    const words = [];
    const walker = doc.createTreeWalker(block, 4 /* NodeFilter.SHOW_TEXT */);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (ref.contains(t) || !(ref.compareDocumentPosition(t) & 4 /* FOLLOWING */)) continue;
      const re = /\S+/g;
      for (let m = re.exec(t.data); m; m = re.exec(t.data)) words.push({ node: t, offset: m.index });
    }
    const range = doc.createRange();
    const tops = words.map(({ node, offset }) => {
      range.setStart(node, offset);
      range.setEnd(node, offset + 1);
      return range.getBoundingClientRect().top;
    });
    const i = nextLineIndex(tops, ref.getBoundingClientRect().bottom);
    if (i < 0) return null;
    // Climb out of inline elements (links, emphasis) that started on the citing
    // line, so the note never lands inside a link; stop at one holding the ref.
    let node = words[i].node;
    while (node.parentNode !== block && !node.parentNode.contains(ref)) node = node.parentNode;
    return node === words[i].node ? words[i] : { before: node };
  }

  function init(doc, win) {
    const post = doc.querySelector('.post');
    if (!post) return;
    const refs = Array.from(post.querySelectorAll('a.footnote[href*="#fn:"]'));
    if (!refs.length) return;
    post.classList.add('has-sidenotes');

    let aside = null, activeRef = null;

    // Take the note out and mend the text node it split.
    function detach() {
      if (!aside || !aside.parentNode) return;
      const parent = aside.parentNode;
      aside.remove();
      parent.normalize();
    }

    function close() {
      detach();
      aside = null;
      if (activeRef) activeRef.classList.remove('is-active');
      activeRef = null;
    }

    function place() {
      const block = citingBlock(activeRef);
      if (!aside || !block) return;
      const margin = win.innerWidth - post.getBoundingClientRect().right - GAP;
      detach();
      if (placement(win.innerWidth) === 'wide' && margin >= NOTE_MIN) {
        aside.classList.add('sidenote--wide');
        aside.style.width = `${Math.min(NOTE_WIDTH, margin)}px`;
        aside.style.top = `${block.offsetTop}px`;
        post.appendChild(aside);
      } else {
        aside.classList.remove('sidenote--wide');
        aside.style.width = '';
        aside.style.top = '';
        const target = lineBreakTarget(doc, block, activeRef);
        if (!target) block.insertAdjacentElement('afterend', aside);
        else if (target.before) target.before.before(aside);
        else target.node.splitText(target.offset).before(aside);
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
      // Resize re-inserts the note; let only the first insertion animate.
      const shown = aside;
      shown.addEventListener('animationend', () => { shown.style.animation = 'none'; }, { once: true });
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
    module.exports = { noteIdFor, placement, citingBlock, nextLineIndex, WIDE_MIN };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
