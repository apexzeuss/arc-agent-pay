import { ScenarioRunner } from "./ScenarioRunner";
import { Footer } from "../components/Footer";

type Scenario = {
  id: string;
  title: string;
  blurb: string;
  amount: string;
  note: string;
  overCap?: boolean;
};

const SCENARIOS: Scenario[] = [
  {
    id: "tip",
    title: "Tip the writer",
    blurb: "A small thank-you for something the agent read.",
    amount: "0.10",
    note: "Under the per-tx ceiling — agent fires immediately.",
  },
  {
    id: "invoice",
    title: "Pay a vendor invoice",
    blurb: "Settle a service the agent consumed.",
    amount: "0.50",
    note: "Still under the ceiling — agent fires.",
  },
  {
    id: "subscription",
    title: "Subscribe at $2.00",
    blurb: "Recurring fee above the per-tx cap.",
    amount: "2.00",
    note: "Should be rejected by the constitution. Cap = 1.00 USDC/tx.",
    overCap: true,
  },
];

export default function TryPage() {
  return (
    <main className="prose">
      <div className="watermark" aria-hidden />

      <div className="meta">
        <span>Scenarios</span>
        <span className="stamp">Try the agent</span>
      </div>

      <h1>
        Three things the agent <span className="amp">might</span> be asked to pay
      </h1>
      <p className="subtitle">
        <span className="pip">●</span>&nbsp;&nbsp;Each click is a real on-chain payment · within the policy or rejected by it
      </p>

      <ol className="scenarios">
        {SCENARIOS.map((s, i) => (
          <li className="scenario" key={s.id} style={{ animationDelay: `${320 + i * 120}ms` }}>
            <div className="scenario-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="scenario-body">
              <div className="scenario-title">{s.title}</div>
              <div className="scenario-blurb">{s.blurb}</div>
              <div className="scenario-amount">
                {s.amount}<span className="unit">&nbsp;USDC</span>
                {s.overCap && <span className="over-cap">over cap</span>}
              </div>
              <div className="scenario-note">{s.note}</div>
              <ScenarioRunner amount={s.amount} id={s.id} />
            </div>
          </li>
        ))}
      </ol>

      <Footer left="arc-agent-pay · scenarios" right="policy enforced · article I" />
    </main>
  );
}
