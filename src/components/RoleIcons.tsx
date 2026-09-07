const ROLE_KEYS = ["vocals", "guitar", "bass", "drums", "keyboard", "harmonica"] as const;
type RoleKey = (typeof ROLE_KEYS)[number];

const ROLE_MATCH: { key: RoleKey; test: RegExp }[] = [
  { key: "vocals", test: /vocal|singer|vox/ },
  { key: "guitar", test: /guitar/ },
  { key: "bass", test: /bass/ },
  { key: "drums", test: /drum|percussion/ },
  { key: "keyboard", test: /key|organ|piano|synth/ },
  { key: "harmonica", test: /harmonica/ },
];

export function parseRoles(role?: string): RoleKey[] {
  if (!role?.trim()) return [];
  const found = new Set<RoleKey>();
  for (const chunk of role.toLowerCase().split(/[/,&+]|\band\b/g)) {
    const piece = chunk.trim();
    if (!piece) continue;
    for (const { key, test } of ROLE_MATCH) {
      if (test.test(piece)) found.add(key);
    }
  }
  return ROLE_KEYS.filter((key) => found.has(key));
}

function Icon({
  label,
  filled,
  wide,
  children,
}: {
  label: string;
  filled?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span title={label} aria-label={label} className="inline-flex text-white">
      <svg
        viewBox={wide ? "0 0 32 16" : "0 0 24 24"}
        className={wide ? "h-8 w-12" : "h-10 w-10"}
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? undefined : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </span>
  );
}

function ImageIcon({ role }: { role: "vocals" | "guitar" | "bass" | "drums" }) {
  return (
    <img
      src={`/role-icons/${role}.png`}
      alt=""
      title={role}
      aria-label={role}
      className="h-10 w-10 object-contain"
    />
  );
}

function RoleGlyph({ role }: { role: RoleKey }) {
  switch (role) {
    case "vocals":
      return <ImageIcon role="vocals" />;
    case "guitar":
      return <ImageIcon role="guitar" />;
    case "bass":
      return <ImageIcon role="bass" />;
    case "drums":
      return <ImageIcon role="drums" />;
    case "keyboard":
      return (
        <Icon label="keyboard">
          <circle cx="12" cy="12" r="10.3" strokeWidth="1.4" />
          <path
            d="M4.2 6.5h15.6l1.3 11H2.9l1.3-11Z"
            fill="currentColor"
            stroke="none"
          />
          <path d="M4 10.2h16M6.1 10.2v7.3M9.1 10.2v7.3M12 10.2v7.3M14.9 10.2v7.3M17.9 10.2v7.3" stroke="#0b0b0b" strokeWidth=".7" />
          <path d="M7.6 10.2h1.2v3.5H7.6zM10.5 10.2h1.2v3.5h-1.2zM15.3 10.2h1.2v3.5h-1.2z" fill="#0b0b0b" stroke="none" />
          <circle cx="6" cy="8.3" r=".55" fill="#0b0b0b" stroke="none" />
          <circle cx="8" cy="8.3" r=".55" fill="#0b0b0b" stroke="none" />
          <path d="M11 8.3h6.8" stroke="#0b0b0b" strokeWidth=".8" />
        </Icon>
      );
    case "harmonica":
      return (
        <Icon label="harmonica">
          <rect x="3" y="9" width="18" height="6" rx="1.2" />
          <path d="M6.5 9v6M10 9v6M13.5 9v6M17 9v6" />
        </Icon>
      );
  }
}

export function RoleIcons({ role }: { role?: string }) {
  const roles = parseRoles(role);
  if (roles.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-2" aria-label={roles.join(", ")}>
      {roles.map((key) => (
        <RoleGlyph key={key} role={key} />
      ))}
    </span>
  );
}
