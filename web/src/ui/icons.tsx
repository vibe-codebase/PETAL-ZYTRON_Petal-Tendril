type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A sprouting vine. */
export const Sprout = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M12 21c0-6 1-9 4-13" /><path d="M13.5 12.5c-3 0-5-2-5.5-5 3 0 5 2 5.5 5zM15 9c.5-3 2.5-4.5 5-4.5-.2 2.8-2.2 4.5-5 4.5z" /></svg>;
/** An open book: the herbarium. */
export const Book = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5zM12 6.5v13" /></svg>;
/** Stars are blooms. */
export const Bloom = ({ size = 22, on }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <ellipse key={i} cx="12" cy="6.5" rx="3" ry="5" transform={`rotate(${i * 60} 12 12)`} fill={on ? 'var(--flower)' : 'none'} stroke={on ? 'var(--ink)' : 'rgba(59,47,34,.35)'} strokeWidth="0.9" />
    ))}
    <circle cx="12" cy="12" r="2.4" fill={on ? '#f1d36a' : 'none'} stroke={on ? 'var(--ink)' : 'rgba(59,47,34,.35)'} strokeWidth="0.9" />
  </svg>
);
