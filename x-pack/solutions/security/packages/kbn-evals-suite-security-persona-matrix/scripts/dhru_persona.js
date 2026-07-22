<script>
  (function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.pbtn'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.pcard'));
    var tables = Array.prototype.slice.call(document.querySelectorAll('table.matrix'));

    function clearFocus() {
      tables.forEach(function (t) {
        t.querySelectorAll('.focuscol').forEach(function (el) { el.classList.remove('focuscol'); });
        t.querySelectorAll('col.focus').forEach(function (el) { el.classList.remove('focus'); });
      });
    }

    function applyFocus(colKeys) {
      clearFocus();
      if (!colKeys || !colKeys.length) return;
      tables.forEach(function (t) {
        colKeys.forEach(function (key) {
          t.querySelectorAll('[data-col="' + key + '"]').forEach(function (el) {
            if (el.tagName === 'COL') { el.classList.add('focus'); }
            else { el.classList.add('focuscol'); }
          });
        });
      });
    }

    function select(persona, scroll) {
      buttons.forEach(function (b) { b.classList.toggle('active', b.dataset.persona === persona); });
      cards.forEach(function (c) { c.classList.toggle('hidden', c.dataset.persona !== persona); });
      var btn = buttons.filter(function (b) { return b.dataset.persona === persona; })[0];
      var cols = btn && btn.dataset.cols ? btn.dataset.cols.split(',') : [];
      applyFocus(cols);
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { select(b.dataset.persona, false); });
    });

    // initialize with the first (CISO) persona focus
    var first = buttons[0];
    if (first) { applyFocus(first.dataset.cols ? first.dataset.cols.split(',') : []); }
  })();
</script>
</body>
</html>
