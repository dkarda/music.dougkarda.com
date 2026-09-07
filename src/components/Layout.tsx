import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/upcoming", label: "Upcoming" },
  { to: "/attended", label: "Attended" },
  { to: "/releases", label: "Releases" },
  { to: "/birthdays", label: "Birthdays" },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="stage-glow pointer-events-none fixed inset-0" />
      <div className="stage-grain" aria-hidden />
      <header className="relative border-b border-line">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[0.7rem] tracking-[0.28em] text-amp uppercase">
              From the pit and the porch
            </p>
            <NavLink
              to="/"
              className="font-display text-3xl tracking-wide text-paper uppercase no-underline"
            >
              Doug’s listening
            </NavLink>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-display text-xs tracking-[0.16em] uppercase">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive
                    ? "border-b-2 border-amp pb-0.5 text-amp"
                    : "text-muted hover:text-chrome"
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative mx-auto max-w-3xl px-5 py-10">
        <Outlet />
      </main>
      <footer className="relative mx-auto max-w-3xl px-5 pb-10 text-sm text-muted">
        Logged nights, local bills, and the bands that still hit.
      </footer>
    </div>
  );
}
