import Link from "next/link";

const LEDE = "A ledger for AI agents that hold money on Arc.";

export default function Landing() {
  const words = LEDE.split(" ");
  return (
    <main className="landing">
      <Link href="/dashboard" className="lede-link" aria-label="Enter the ledger">
        <p className="lede">
          {words.map((w, i) => (
            <span key={i} className="word" style={{ animationDelay: `${260 + i * 80}ms` }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </Link>
    </main>
  );
}
