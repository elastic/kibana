# AI Insights

## About This Document

**Audience**: LLM coding agents working on AI Insights, Observability Agent or Agent Builder in general.

**Purpose**: AI Insights are one-click, LLM-powered explanations for Observability data — logs, metrics, traces and alerts. The user clicks a button in the Kibana UI (e.g., "Help me understand this alert") and receives an AI-generated summary without needing to write a prompt or starting a conversation.

Two characteristics define AI Insights and distinguish them from the Observability Agent:

1. **Prefetched context** — All data is fetched up front via predetermined queries, without consulting the LLM. The Agent, by contrast, decides what data to fetch on-the-fly via LLM-selected tool calls. AI Insights hardcode which data sources to query for each insight type (e.g., an alert insight always fetches service summary, downstream dependencies, change points, log groups, and runtime metrics).

2. **Hardcoded prompts** — The system and user prompts are static and defined in code. There is no user-provided prompt. Each insight type has a fixed question (e.g., "analyze this alert and summarize the cause, impact, and next steps") and a fixed output structure. The only variable input is the prefetched context.

---

## 1. How AI Insights Differ from Tools

| Aspect            | Observability Agent                        | AI Insights                                                           |
| ----------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| **Trigger**       | User writes a conversational prompt        | User clicks a button (no prompt)                                      |
| **Data fetching** | LLM decides what to fetch via tool calling | Predetermined — all context is prefetched without LLM involvement     |
| **Prompt**        | User-provided, open-ended                  | Hardcoded per insight type (static question + fixed output structure) |
| **API surface**   | `POST /api/agent_builder/converse`         | `POST /internal/observability_agent_builder/ai_insights/{type}`       |
| **Conversation**  | Multi-turn agent loop                      | Single-turn; user can optionally continue into a conversation         |

---

## 2. Context Assembly

Each insight type defines its own set of predetermined data sources. The server fetches all of them before calling the LLM. Context sources are specific to the domain — for example, the alert insight (`get_alert_ai_insights.ts`) fetches the alert document, APM service summary, downstream dependencies, change points, log groups, and runtime metrics, each with a hardcoded time window relative to the alert start time.

Each context source is wrapped in XML-style tags (e.g., `<ErrorDetails>`, `<DownstreamDependencies>`, `<CorrelatedLogSequence>`) with JSON payloads, making it easy for the LLM to distinguish between sources.

To understand which data sources a specific insight prefetches, read the corresponding `get_*_ai_insights.ts` or `generate_*_ai_insight.ts` file in `server/routes/ai_insights/`.

---

## 3. Architecture

### Data Flow

User clicks button in UI (e.g., "Help me understand this alert"):

- Insight component calls the corresponding AI Insights API endpoint
- Server prefetches the primary document + all related context (no LLM involvement)
- Prefetched context and static prompts are sent to an LLM
- LLM generates a markdown response (single call, no tool use)
- Summary is dislayed to the user
- Optional: "Start conversation" opens Agent flyout with the insight as context

---

## 4. Prompt Design

### Guardrails (all insight types)

- **Strict factuality**: The LLM must only reference data provided in the context. No speculation or hallucination.
- **Structured output**: Each insight type defines a specific output format (e.g., Summary / Assessment / Next Steps for alerts).
- **SRE audience**: Language should be technical and actionable, appropriate for incident responders.
- **Entity linking**: Prompts include instructions for generating Kibana deep links to services, traces, errors, and other entities via markdown links.

### System Prompt Role

All insight types use a system prompt that establishes the LLM as an "SRE Assistant" analyzing Observability data. The system prompt specifies:

- The exact output sections expected
- Rules against speculation
- Formatting requirements (markdown)

### User Prompt Structure

The user prompt provides the assembled context and a task directive. Context is structured using XML-style tags for clear delineation (e.g., `<AlertDetails>`, `<ErrorContext>`, `<CorrelatedLogSequence>`).

---

## 5. UI Integration

### Components

Each insight type has a React component in `public/components/insights/` (e.g., `AlertAiInsight`). These are thin wrappers that define which API endpoint to call and what attachments to build for conversation handoff — the shared rendering logic lives in `public/components/ai_insight/`.

Insight components are registered with their host surfaces via factory functions (e.g., `createAlertAIInsight`) or feature registries (e.g., `LogAiInsight` registers with Discover's shared features registry). Consuming plugins (APM, Alerts, Discover) call these to get a React component they can render.

### Visibility Prerequisites

The insight accordion only renders when ALL of these are true:

- At least one GenAI connector is configured
- Agent Builder plugin is available
- Agent chat experience is enabled
- Enterprise license

### Conversation Handoff

After viewing an insight, users can click "Start conversation" to open the Agent flyout. This passes **attachments** containing the generated summary, the raw prefetched context, and domain-specific identifiers (e.g., `alertId`, `errorId`). This gives the Agent full context to continue the investigation without the user repeating information.

---

## 6. Testing and Development

### File Locations

| Type          | Path                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Server routes | `server/routes/ai_insights/`                                                                                            |
| UI components | `public/components/insights/`, `public/components/ai_insight/`                                                          |
| API tests     | `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/ai_insights/` |

### Invoking AI Insights Locally

All endpoints are internal and return SSE streams. Example using the log insight:

```bash
curl -X POST http://localhost:5601/internal/observability_agent_builder/ai_insights/log \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' \
  -H 'Content-Type: application/json' \
  -d '{ "index": "<log_index>", "id": "<document_id>" }'
```

The endpoint pattern is `POST /internal/observability_agent_builder/ai_insights/{type}`. Each type has its own required body parameters — check `route.ts` for the schema.

### Running API Tests

```bash
node scripts/functional_test_runner \
  --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.ai_agent.stateful.config.ts \
  --grep="ai_insights"
```
