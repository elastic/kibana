# AI Insights

## About This Document

**Audience**: LLM coding agents working on Observability AI Insights.

**Purpose**: AI Insights are one-click, LLM-powered explanations for Observability data — alerts, APM errors, and log entries. The user clicks a button in the Kibana UI (e.g., "Help me understand this alert") and receives an AI-generated summary without writing a prompt or starting a conversation.

Two characteristics define AI Insights and distinguish them from the Observability Agent:

1. **Prefetched context** — All data is fetched up front via predetermined queries, without consulting the LLM. The Agent, by contrast, decides what data to fetch on-the-fly via LLM-selected tool calls. AI Insights hardcode which data sources to query for each insight type (e.g., an alert insight always fetches service summary, downstream dependencies, change points, log groups, and runtime metrics).

2. **Hardcoded prompts** — The system and user prompts are static and defined in code. There is no user-provided prompt. Each insight type has a fixed question (e.g., "analyze this alert and summarize the cause, impact, and next steps") and a fixed output structure. The only variable input is the prefetched context.

**Include**: Architecture, data flow, context assembly, prompt design, and UI integration specific to AI Insights.

**Exclude**: Generic LLM/streaming knowledge, Agent Builder tool conventions (see `server/tools/AGENTS.md`).

---

## 1. How AI Insights Differ from Tools

| Aspect            | Observability Agent                      | AI Insights                                                                           |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| **Trigger**       | User writes a conversational prompt      | User clicks a button (no prompt)                                                      |
| **Data fetching** | LLM decides what to fetch via tool calls | Predetermined — all context is prefetched without LLM involvement                     |
| **Prompt**        | User-provided, open-ended                | Hardcoded per insight type (static question + fixed output structure)                 |
| **Output**        | Conversational response from the agent   | Streamed markdown rendered directly to the user                                       |
| **API surface**   | `POST /api/agent_builder/converse`       | `POST /internal/observability_agent_builder/ai_insights/{type}`                       |
| **Conversation**  | Multi-turn agent loop                    | Standalone; user can optionally continue into a conversation via "Start conversation" |

---

## 2. Context Assembly

Each insight type defines its own set of predetermined data sources. The server fetches all of them before calling the LLM. Context sources are specific to the domain — for example, the alert insight (`get_alert_ai_insights.ts`) fetches the alert document, APM service summary, downstream dependencies, change points, log groups, and runtime metrics, each with a hardcoded time window relative to the alert start time.

Each context source is wrapped in XML-style tags (e.g., `<ErrorDetails>`, `<DownstreamDependencies>`, `<CorrelatedLogSequence>`) with JSON payloads, making it easy for the LLM to distinguish between sources.

To understand which data sources a specific insight prefetches, read the corresponding `get_*_ai_insights.ts` or `generate_*_ai_insight.ts` file in `server/routes/ai_insights/`.

---

## 3. Architecture

### Data Flow

```
User clicks button in UI (e.g., "Help me understand this alert")
  → Insight component calls the corresponding AI Insights API endpoint
  → Server prefetches the primary document + all related context (no LLM involvement)
  → Prefetched context is injected into hardcoded prompts
  → LLM generates a streamed markdown response (single call, no tool use)
  → Summary is rendered in real time in an accordion
  → Optional: "Start conversation" opens Agent flyout with the insight as context
```

### Server-Side Pattern

Every insight follows the same pattern:

1. **Fetch the primary document** (alert, error, or log) from Elasticsearch.
2. **Prefetch all related context** from predetermined data sources. The set of sources is hardcoded per insight type — the LLM has no influence on what is fetched. Alert and error insights use the data registry and tool handlers; log insights use direct ES queries.
3. **Inject context into hardcoded prompts**. The system prompt defines the LLM's role (SRE Assistant) and output structure. The user prompt contains the prefetched context and a static task directive.
4. **Stream the LLM response** back to the client. This is a single LLM call with no agentic loop or tool use — the LLM simply summarizes the provided context.

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

| Type           | Path                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Server routes  | `server/routes/ai_insights/`                                                                                            |
| UI components  | `public/components/insights/`, `public/components/ai_insight/`                                                          |
| API tests      | `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/ai_insights/` |
| Test utilities | `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/utils/`       |

### Running API Tests

```bash
node scripts/functional_test_runner \
  --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.ai_agent.stateful.config.ts \
  --grep="ai_insights"
```

Or use the alias:

```bash
oia-test-api-runner-stateful --grep="ai_insights"
```

**Note**: All AI Insights tests are tagged `skipCloud` because they use an LLM proxy to mock AI responses.

### Test Architecture

Tests use an LLM proxy that intercepts LLM requests and returns canned responses. The proxy also captures the messages sent to the LLM, enabling assertions on both:

- **Response content**: Verify the streamed summary and context.
- **LLM prompt content**: Verify that the system and user messages contain expected context (e.g., `<ErrorDetails>`, `<DownstreamDependencies>`, `<CorrelatedLogSequence>`).

### Test Data

Each insight test has a synthtrace scenario that generates the required Observability data (e.g., APM errors, distributed traces, log entries). These live alongside the test specs or in the shared `utils/synthtrace_scenarios/ai_insights/` directory.

---

## 7. Adding a New Insight Type

1. **Server**: Create a `get_<type>_ai_insights.ts` in `server/routes/ai_insights/`. Follow the existing pattern: fetch document → assemble context → build prompts → stream LLM response.
2. **Route**: Register the endpoint in `route.ts`. Use `POST /internal/observability_agent_builder/ai_insights/<type>`, require `apiPrivileges.readAgentBuilder`, return SSE stream.
3. **UI component**: Create a component in `public/components/insights/`. Follow the existing insight components for the streaming and attachment patterns.
4. **Registration**: Register the component either via a feature registry (like Discover) or expose a factory function for consuming plugins.
5. **Attachment type**: If needed, add a new attachment type constant in `common/constants.ts` and register its UI definition.
6. **Tests**: Add an API test in `ai_insights/` with synthtrace data, LLM proxy, and assertions on both the response and the LLM prompt content.
