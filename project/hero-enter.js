// Typing animation for the h1 spans only.
(function () {

  function typeText(el, text, cps, onDone) {
    el.textContent = '';
    var i = 0;
    var delay = 1000 / cps;
    function tick() {
      i++;
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        setTimeout(tick, delay);
      } else {
        onDone && onDone();
      }
    }
    setTimeout(tick, delay);
  }

  window.__runHeroEnter = function () {
    var nameEl = document.querySelector('.hero h1 .name');
    var termEl = document.querySelector('.hero h1 .h1-terminal');
    if (!nameEl || !termEl) return;

    var nameText = nameEl.textContent;
    var termText = termEl.textContent;

    typeText(nameEl, nameText, 22, function () {
      typeText(termEl, termText, 20, null);
    });
  };

})();
