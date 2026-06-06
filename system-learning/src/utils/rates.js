const RATES_KEY = "academic_year_rates";

export function getStoredRates() {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function setStoredRates(rates) {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  window.dispatchEvent(new CustomEvent("rates-changed", { detail: rates }));
}

export function getRateForYear(year) {
  const rates = getStoredRates();
  return rates[year] || 0;
}
