const words = ["Web Developer", "Frontend Developer", "Freelancer"];
const roleEl = document.querySelector(".typing-text span");
const welcomeEl = document.querySelector(".welcome-text span");
const welcomeMessage = welcomeEl.textContent;

let wordIndex = 0, charIndex = 0, deleting = false;

function typeWelcome() {
  welcomeEl.textContent = "";
  let i = 0;
  const interval = setInterval(() => {
    welcomeEl.textContent += welcomeMessage[i];
    i++;
    if (i === welcomeMessage.length) {
      clearInterval(interval);
      cycleFlagColors();
    }
  }, 80);
}

function cycleFlagColors() {
  const colors = ["#009A44", "#FEDD00", "#DA121A"];
  let colorIndex = 0;
  setInterval(() => {
    welcomeEl.style.color = colors[colorIndex];
    colorIndex = (colorIndex + 1) % colors.length;
  }, 800);
}

function typeRole() {
  const current = words[wordIndex];

  if (deleting) {
    charIndex--;
    roleEl.textContent = current.substring(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      setTimeout(typeRole, 300);
      return;
    }
  } else {
    charIndex++;
    roleEl.textContent = current.substring(0, charIndex);
    if (charIndex === current.length) {
      deleting = true;
      setTimeout(typeRole, 1500);
      return;
    }
  }

  setTimeout(typeRole, deleting ? 60 : 120);
}

typeWelcome();
typeRole();

const backToTopBtn = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopBtn.style.display = "block";
  } else {
    backToTopBtn.style.display = "none";
  }
});

backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const faders = document.querySelectorAll(".fade-in");

const appearOnScroll = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

faders.forEach(fader => appearOnScroll.observe(fader));

const helpfulButtons = document.querySelectorAll(".helpful-btn");

helpfulButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    const buttons = button.parentElement.querySelectorAll(".helpful-btn");
    buttons.forEach(function(btn) {
      btn.disabled = true;
    });
    button.textContent += " ✓";
  });
});

/* ---- Rate this portfolio widget (shared across all visitors via Supabase) ---- */

const rateStarsContainer = document.getElementById("rateStars");
const rateAverageEl = document.getElementById("rateAverage");

if (rateStarsContainer && rateAverageEl && typeof supabase !== "undefined") {
  const rateStars = rateStarsContainer.querySelectorAll("span");

  const SUPABASE_URL = "https://rkcvgbcrlsfrddcjciot.supabase.co";
  const SUPABASE_KEY = "sb_publishable_0Z6Frz22R17gqMJCxHNeYw_LL9OonfJ";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const RATING_ROW_ID = 1;

  async function fetchRatingRow() {
    const { data, error } = await supabaseClient
      .from("ratings")
      .select("*")
      .eq("id", RATING_ROW_ID)
      .single();

    if (error) {
      console.error("Supabase fetch error:", error);
      return null;
    }
    return data;
  }

  function renderAverage(row) {
    if (!row || row.count === 0) {
      rateAverageEl.textContent = "Average: No ratings yet — be the first!";
      return;
    }
    const avg = row.total / row.count;
    const label = row.count === 1 ? "rating" : "ratings";
    rateAverageEl.textContent = `Average: ${avg.toFixed(1)} ★ (${row.count} ${label})`;
  }

  async function updateAverageDisplay() {
    const row = await fetchRatingRow();
    renderAverage(row);
  }

  // Writes now go through the submit_rating() Postgres function instead of
  // a client-side read-then-write. That function increments total/count
  // atomically on the database, so two visitors rating at nearly the same
  // moment can't silently overwrite each other's vote -- the old
  // fetch-then-recalculate-then-write approach couldn't guarantee that.
  async function saveRating(value) {
    const { data, error } = await supabaseClient.rpc("submit_rating", {
      rating_value: value
    });

    if (error) {
      console.error("Supabase rpc error:", error);
      rateAverageEl.textContent = "Couldn't save your rating — try again later.";
      return null;
    }

    return data && data[0] ? data[0] : null;
  }

  function highlightStars(value) {
    rateStars.forEach(star => {
      star.classList.toggle("selected", Number(star.dataset.value) <= value);
    });
  }

  let hasRatedThisSession = false;

  rateStars.forEach(star => {
    star.addEventListener("mouseenter", () => {
      if (hasRatedThisSession) return;
      highlightStars(Number(star.dataset.value));
    });

    star.addEventListener("click", async () => {
      if (hasRatedThisSession) return;
      hasRatedThisSession = true;
      rateStarsContainer.style.pointerEvents = "none";

      const value = Number(star.dataset.value);
      highlightStars(value);

      const updatedRow = await saveRating(value);
      if (updatedRow) {
        renderAverage(updatedRow);
      }
    });
  });

  rateStarsContainer.addEventListener("mouseleave", () => {
    if (!hasRatedThisSession) {
      highlightStars(0);
    }
  });

  updateAverageDisplay();
}
/* ---- Automatic Portfolio Visitor Counter ---- */

const portfolioViews = document.getElementById("portfolioViews");

if (portfolioViews && typeof supabase !== "undefined") {

  const VISITOR_SUPABASE_URL =
    "https://rkcvgbcrlsfrddcjciot.supabase.co";

  const VISITOR_SUPABASE_KEY =
    "sb_publishable_0Z6Frz22R17gqMJCxHNeYw_LL9OonfJ";

  const visitorSupabase = supabase.createClient(
    VISITOR_SUPABASE_URL,
    VISITOR_SUPABASE_KEY
  );

  let visitorKey = localStorage.getItem("portfolioVisitorKey");

  if (!visitorKey) {
    if (crypto.randomUUID) {
      visitorKey = crypto.randomUUID();
    } else {
      visitorKey =
        Date.now().toString() +
        Math.random().toString(36).substring(2);
    }

    localStorage.setItem("portfolioVisitorKey", visitorKey);
  }

  async function recordPortfolioVisit() {

    const { data, error } = await visitorSupabase.rpc(
      "record_portfolio_visit",
      {
        p_visitor_key: visitorKey
      }
    );

    if (error) {
      console.error("Portfolio visitor error:", error);
      portfolioViews.textContent = "Views unavailable";
      return;
    }

    if (data && data.length > 0) {
      portfolioViews.textContent =
        `Portfolio Views: ${data[0].views}`;
    }
  }

  recordPortfolioVisit();
}
