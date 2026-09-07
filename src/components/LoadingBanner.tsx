export function LoadingBanner({ label = "Loading" }: { label?: string }) {
  return (
    <p className="loading-banner" aria-live="polite" aria-busy="true">
      {label}
      <span aria-hidden="true">
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
      </span>
    </p>
  );
}
