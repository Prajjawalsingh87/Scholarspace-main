// ScholarSpace — shared site behaviour
(function () {
  "use strict";

  // Mobile navigation
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("primary-nav");
  if (toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("is-open") && !menu.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) setOpen(false);
    });
  }

  // Broken remote thumbnails fall back to an icon tile
  document.querySelectorAll(".subject-card .thumb img").forEach(function (img) {
    var fail = function () {
      img.parentElement.classList.add("no-img");
      img.remove();
    };
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener("error", fail);
  });

  // Subject search
  var search = document.getElementById("subject-search");
  if (search) {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-subject]"));
    var count = document.getElementById("subject-count");
    var empty = document.getElementById("subject-empty");
    var update = function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var match = !q || c.getAttribute("data-subject").toLowerCase().indexOf(q) !== -1;
        c.hidden = !match;
        if (match) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? " subject" : " subjects");
      if (empty) empty.style.display = shown ? "none" : "block";
    };
    search.addEventListener("input", update);
    update();
  }

  // Feedback form: static hosting has no backend, so compose an email
  var form = document.getElementById("feedback-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var to = form.getAttribute("data-mailto");
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var msg = form.elements.feedback.value.trim();
      var subject = "ScholarSpace feedback from " + name;
      var body = msg + "\n\n— " + name + " (" + email + ")";
      window.location.href =
        "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      var status = document.getElementById("feedback-status");
      if (status) status.hidden = false;
    });
  }
})();
