export function Footer({
  left = "arc-agent-pay · v0.1",
  right = "chain · 5042002 · USDC native gas",
}: {
  left?: string;
  right?: string;
}) {
  return (
    <footer>
      <span>{left}</span>
      <span>{right}</span>
    </footer>
  );
}
