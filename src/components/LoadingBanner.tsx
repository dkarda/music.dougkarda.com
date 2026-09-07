export function LoadingBanner() {
  return (
    <p className="loading-banner" aria-live="polite" aria-busy="true">
      Loading
      <span aria-hidden="true">
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
      </span>
    </p>
  );
}
