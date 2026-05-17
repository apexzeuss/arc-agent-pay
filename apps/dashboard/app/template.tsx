// Next.js re-mounts templates on every navigation, so any CSS animation
// applied here replays as the user moves between pages.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
