import { CopyButton } from "../CopyButton";
import { Footer } from "../components/Footer";

const MCP_URL = "https://pay-on-arc.vercel.app/mcp";

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "arc-agent": {
      "url": "${MCP_URL}",
      "transport": "sse"
    }
  }
}`;

const CURSOR_CONFIG = `{
  "mcpServers": {
    "arc-agent": {
      "url": "${MCP_URL}"
    }
  }
}`;

const OPENAI_TOOL = `{
  "type": "function",
  "function": {
    "name": "pay",
    "description": "Send USDC from the agent's wallet to a recipient on Arc.",
    "parameters": {
      "type": "object",
      "properties": {
        "to":     { "type": "string", "description": "Recipient address (0x…)" },
        "amount": { "type": "number", "description": "USDC amount (max 1.00)" },
        "memo":   { "type": "string", "description": "Optional reason" }
      },
      "required": ["to", "amount"]
    }
  }
}`;

export default function PlugInPage() {
  return (
    <main className="prose">
      <div className="watermark" aria-hidden />

      <div className="meta">
        <span>Plug In</span>
        <span className="stamp">For developers</span>
      </div>

      <h1>
        Wire your <span className="amp">LLM</span> into the agent
      </h1>
      <p className="subtitle">
        <span className="pip">●</span>&nbsp;&nbsp;MCP endpoint · drop-in config for Claude / Cursor / OpenAI
      </p>

      <div className="endpoint">
        <div className="ss-label">MCP endpoint</div>
        <div className="endpoint-url">
          <code>{MCP_URL}</code>
          <CopyButton text={MCP_URL} label="Copy URL" />
        </div>
        <div className="endpoint-status">
          <span className="dot-pending" /> Server launching with Vercel deploy · stub for now
        </div>
      </div>

      <h2>Claude Desktop</h2>
      <p>Add to <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (Mac) or <code>%APPDATA%/Claude/claude_desktop_config.json</code> (Windows):</p>
      <div className="snippet">
        <pre>{CLAUDE_DESKTOP_CONFIG}</pre>
        <CopyButton text={CLAUDE_DESKTOP_CONFIG} label="Copy" />
      </div>

      <h2>Cursor</h2>
      <p>In Cursor Settings → MCP, add a new server:</p>
      <div className="snippet">
        <pre>{CURSOR_CONFIG}</pre>
        <CopyButton text={CURSOR_CONFIG} label="Copy" />
      </div>

      <h2>OpenAI / generic function-calling</h2>
      <p>Or expose the agent directly as a tool to any LLM with function calling:</p>
      <div className="snippet">
        <pre>{OPENAI_TOOL}</pre>
        <CopyButton text={OPENAI_TOOL} label="Copy" />
      </div>

      <div className="rule-future" style={{ marginTop: 48 }}>
        <h2>What the agent will accept</h2>
        <p>
          Any payment instruction within the rules on the <a href="/policy">Constitution</a>. Outside the rules, the agent rejects with a structured error the LLM can read and try again with adjusted parameters.
        </p>
      </div>

      <Footer left="arc-agent-pay · mcp" right="protocol · model context protocol" />
    </main>
  );
}
