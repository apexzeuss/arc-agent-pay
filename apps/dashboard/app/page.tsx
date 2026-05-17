const LEDE =
  "A working ledger where AI principals hold stablecoin and settle, in under a second, on Arc.";

export default function Landing() {
  const words = LEDE.split(" ");
  return (
    <main className="landing">
      <div className="landing-mark" aria-hidden>
        <span>◜</span>
        <span>◝</span>
        <span>◟</span>
        <span>◞</span>
      </div>

      <p className="lede">
        {words.map((w, i) => (
          <span key={i} className="word" style={{ animationDelay: `${260 + i * 80}ms` }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>

      <a href="/dashboard" className="enter">
        Enter the ledger&nbsp;&nbsp;→
      </a>

      <div className="landing-foot">
        № 0001 · Arc Testnet · Chain 5042002
      </div>
    </main>
  );
}
