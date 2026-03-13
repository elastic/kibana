# Elastic Console Session Sync API

This document describes the Kibana APIs available for synchronizing Agent Builder sessions with a locally running Elastic Console agent. It covers the intent behind the integration, authentication, available endpoints, data models, and recommended workflows.

## Intent

Elastic's Agent Builder in Kibana provides a conversational AI experience backed by Elastic's tools (log exploration, trace analysis, alerting, etc.). Separately, a user may run a local Elastic Console agent that operates in their terminal or IDE, close to their codebase and local environment.

The goal of session sync is to bridge these two worlds so that work started in one agent can be continued in the other, and results flow back to wherever the user needs them.

### What the Elastic Console agent should implement

The Elastic Console agent is the **complement** to the Kibana side. It needs to implement three capabilities:

1. **Poll for handover requests.** A background loop that periodically calls the list-conversations endpoint filtered to `handover_requested=true`. When a conversation appears, the agent fetches its full rounds, clears the handover flag (so Kibana knows it was picked up), and injects the conversation context into its own session so it can continue the work locally.

2. **Read and search existing sessions.** The agent should be able to list the user's Agent Builder conversations (optionally filtered by agent ID) and fetch any conversation by ID. This lets the agent reference prior context, pull in results from Kibana-side investigations, or let the user explicitly say "continue conversation X".

3. **Push sessions back to Kibana.** After completing local work, the agent should create a new conversation in Agent Builder containing its rounds (user inputs, tool calls, assistant responses). This makes the results visible in the Kibana UI, where the user or other team members can review them and optionally continue the conversation with Agent Builder's full tool suite.

### Design principles

- **User-scoped.** The API key from the Elastic Console setup endpoint is tied to the Kibana user who created it. The Elastic Console agent automatically sees only that user's conversations -- no additional access control is needed.
- **Poll, don't push.** Kibana sets a flag; the Elastic Console agent polls for it. This keeps the architecture simple (no websockets, no callback URLs) and works regardless of network topology.
- **Conversations are the unit of sync.** Each conversation is a self-contained session with a title, ordered rounds, and optional attachments. The Elastic Console agent reads and writes whole conversations; it does not need to understand Agent Builder's internal execution model.
- **Handover is explicit.** A conversation is only picked up when `handover_requested` is `true`. The Elastic Console agent must clear the flag after picking it up to prevent duplicate processing.

### Typical user journey

```
User is in Kibana Agent Builder, investigating a production issue.
The agent has gathered logs, traces, and metrics but the user realizes
they need to correlate with local code changes.

  1. User clicks "Push to Elastic Console" in the Kibana UI
     -> sets handover_requested = true on the conversation

  2. Elastic Console agent (running locally) picks up the conversation on next poll
     -> fetches full rounds, clears the handover flag
     -> injects context: "Continuing from Agent Builder session: <title>"
     -> has access to all prior tool results (log groups, traces, etc.)

  3. User works with the Elastic Console agent in their terminal
     -> agent can grep code, run tests, read local files
     -> produces a diagnosis and suggested fix

  4. Elastic Console agent pushes a summary conversation back to Kibana
     -> POST /api/agent_builder/conversations with the session rounds
     -> user (and teammates) can see the results in Agent Builder UI

  5. User optionally continues in Kibana with the full Elastic tool suite
```

## Authentication

All Agent Builder APIs require authentication via an API key. The Elastic Console setup endpoint provisions this key automatically.

### Obtaining credentials

```
POST /internal/observability_onboarding/opencode/setup
```

This returns:

```json
{
  "elasticsearchUrl": "https://localhost:9200",
  "kibanaUrl": "https://localhost:5601",
  "apiKeyEncoded": "<base64-encoded-api-key>",
  "provider": { ... }
}
```

### Using the API key

Include the API key in all subsequent requests as an `Authorization` header:

```
Authorization: ApiKey <apiKeyEncoded>
```

The API key is created on behalf of the current Kibana user. Conversation queries are scoped to that user, so the Elastic Console agent sees the same conversations as the user who ran the setup.

All requests must also include:

```
kbn-xsrf: true
elastic-api-version: 2023-10-31
Content-Type: application/json
```

## Data Model

### Conversation

```json
{
  "id": "string",
  "agent_id": "string",
  "user": { "id": "string", "username": "string" },
  "title": "string",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "rounds": [ ConversationRound, ... ],
  "attachments": [ VersionedAttachment, ... ],
  "state": { ... },
  "handover_requested": true | false
}
```

### ConversationRound

Each round represents one user-assistant exchange:

```json
{
  "id": "uuid",
  "status": "in_progress" | "completed" | "awaiting_prompt",
  "input": {
    "message": "user message text"
  },
  "steps": [
    {
      "type": "tool_call",
      "tool_call_id": "string",
      "tool_id": "string",
      "params": { ... },
      "results": [
        {
          "type": "text",
          "tool_result_id": "string",
          "value": "result text"
        }
      ]
    },
    {
      "type": "reasoning",
      "reasoning": "thinking text"
    }
  ],
  "response": {
    "message": "assistant response text"
  },
  "started_at": "ISO 8601 timestamp",
  "time_to_first_token": 0,
  "time_to_last_token": 0,
  "model_usage": {
    "connector_id": "string",
    "llm_calls": 0,
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

### ConversationWithoutRounds

The list endpoint returns conversations without the `rounds` field, for efficiency. All other fields are the same.

## Endpoints

### List conversations

List all conversations for the authenticated user. Supports filtering by agent ID and handover status.

```
GET /api/agent_builder/conversations
```

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_id` | string (optional) | Filter by agent ID |
| `handover_requested` | boolean (optional) | Filter by handover status |

**Response:**

```json
{
  "results": [ ConversationWithoutRounds, ... ]
}
```

**Example — poll for conversations waiting for handover:**

```bash
curl -X GET "${KIBANA_URL}/api/agent_builder/conversations?handover_requested=true" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31"
```

### Get conversation by ID

Retrieve a full conversation including all rounds.

```
GET /api/agent_builder/conversations/{conversation_id}
```

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `conversation_id` | string | The conversation ID |

**Response:** Full `Conversation` object.

**Example:**

```bash
curl -X GET "${KIBANA_URL}/api/agent_builder/conversations/${CONVERSATION_ID}" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31"
```

### Create conversation

Push a new conversation into Agent Builder from an external agent.

```
POST /api/agent_builder/conversations
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | yes | The agent ID this conversation belongs to |
| `title` | string | yes | Conversation title |
| `rounds` | ConversationRound[] | yes | Array of conversation rounds |
| `attachments` | VersionedAttachment[] | no | Conversation-level attachments |
| `handover_requested` | boolean | no | Whether the conversation is flagged for handover |

**Response:**

```json
{
  "conversation": Conversation
}
```

**Example — push a simple session:**

```bash
curl -X POST "${KIBANA_URL}/api/agent_builder/conversations" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "elastic-ai-agent",
    "title": "Elastic Console session: troubleshoot high CPU",
    "rounds": [
      {
        "id": "round-1",
        "status": "completed",
        "input": { "message": "Why is my host CPU usage high?" },
        "steps": [],
        "response": { "message": "I checked the metrics and found..." },
        "started_at": "2026-03-12T10:00:00Z",
        "time_to_first_token": 500,
        "time_to_last_token": 3000,
        "model_usage": {
          "connector_id": "elastic-console",
          "llm_calls": 1,
          "input_tokens": 150,
          "output_tokens": 200
        }
      }
    ]
  }'
```

### Toggle handover status

Set or clear the handover flag on a conversation.

```
POST /api/agent_builder/conversations/{conversation_id}/_handover
```

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `conversation_id` | string | The conversation ID |

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requested` | boolean | yes | `true` to flag for handover, `false` to clear |

**Response:**

```json
{
  "conversation": ConversationWithoutRounds
}
```

**Example — clear handover after picking up a session:**

```bash
curl -X POST "${KIBANA_URL}/api/agent_builder/conversations/${CONVERSATION_ID}/_handover" \
  -H "Authorization: ApiKey ${API_KEY}" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -H "Content-Type: application/json" \
  -d '{ "requested": false }'
```

### Send a message (continue conversation)

Send a message to an existing conversation. Use this to continue a conversation that was handed over.

```
POST /api/agent_builder/converse
```

**Request body (relevant fields):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_id` | string | yes (for continuation) | ID of the conversation to continue |
| `input` | string | yes | The user message |
| `agent_id` | string | no | Defaults to `elastic-ai-agent` |

**Response:** `{ conversation_id, round_id, response: { message } }`

For streaming, use `POST /api/agent_builder/converse/async` with the same body. The response is an SSE stream.

### Delete conversation

```
DELETE /api/agent_builder/conversations/{conversation_id}
```

**Response:** `{ "success": true }`

## Workflows

### Polling for handover (Kibana to Elastic Console)

The Elastic Console agent should periodically poll for conversations flagged for handover:

```
1. Poll:  GET /api/agent_builder/conversations?handover_requested=true
2. If results are non-empty, for each conversation:
   a. Fetch full conversation:  GET /api/agent_builder/conversations/{id}
   b. Read the rounds to understand context
   c. Clear the handover flag:  POST /api/agent_builder/conversations/{id}/_handover  { "requested": false }
   d. Process the session locally
   e. Optionally push results back (see below)
```

Recommended poll interval: 5 seconds.

### Pushing a session (Elastic Console to Kibana)

When the Elastic Console agent completes work and wants to make it visible in Kibana:

```
1. Create conversation:  POST /api/agent_builder/conversations
   - Include all rounds with user inputs and assistant responses
   - Set a descriptive title
2. The session is now visible in the Agent Builder UI
3. The user can continue the conversation from the Kibana UI
```

### Bidirectional handover

A full round-trip where Kibana hands off to Elastic Console, which completes work and hands back:

```
1. Kibana user flags conversation for handover
2. Elastic Console polls and picks up the conversation
3. Elastic Console clears the handover flag
4. Elastic Console does work locally (using context from the conversation rounds)
5. Elastic Console pushes a new conversation (or appends to the existing one) with results
6. User sees results in Kibana Agent Builder UI
```

## Implementation Guide for the Elastic Console Agent

This section is a checklist for implementing the Kibana session sync complement inside the Elastic Console agent.

### Prerequisites

The Elastic Console agent needs the following configuration values (provided by the Kibana Elastic Console setup page):

| Config key | Source | Description |
|------------|--------|-------------|
| `kibana_url` | setup response `kibanaUrl` | Base URL for all API calls |
| `api_key` | setup response `apiKeyEncoded` | Authentication token |

### Component 1: Kibana API client

Build a small HTTP client that wraps the endpoints above. Every request must include:

```
Authorization: ApiKey <api_key>
kbn-xsrf: true
elastic-api-version: 2023-10-31
Content-Type: application/json
```

The client needs these methods:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `list_conversations(agent_id?, handover_requested?)` | `GET /api/agent_builder/conversations` | List/filter conversations |
| `get_conversation(id)` | `GET /api/agent_builder/conversations/{id}` | Fetch full conversation with rounds |
| `create_conversation(body)` | `POST /api/agent_builder/conversations` | Push a session into Kibana |
| `set_handover(id, requested)` | `POST /api/agent_builder/conversations/{id}/_handover` | Toggle handover flag |

### Component 2: Handover poller

A background task that runs on an interval (recommended: every 5 seconds):

```
loop:
  conversations = list_conversations(handover_requested=true)
  for each conversation in conversations:
    full = get_conversation(conversation.id)
    set_handover(conversation.id, false)
    inject_into_local_session(full)
  sleep(5s)
```

When injecting into the local session, the agent should:

- Create a new local session (or append to the current one)
- Include the conversation title as context
- Serialize the rounds into a format the local agent understands, for example:

```
Continuing from Kibana Agent Builder session: "<title>"

Previous conversation:
---
User: <round.input.message>
Assistant: <round.response.message>
[Tool calls and results can be summarized or included verbatim]
---
```

### Component 3: Session push

After the Elastic Console agent completes work, it should push the session to Kibana:

```
rounds = convert_local_session_to_rounds()
create_conversation({
  agent_id: "elastic-ai-agent",
  title: "Elastic Console: <descriptive title>",
  rounds: rounds
})
```

Each local exchange (user input + agent response) maps to one `ConversationRound`. The minimum required fields per round are:

```json
{
  "id": "<unique-id>",
  "status": "completed",
  "input": { "message": "<user input>" },
  "steps": [],
  "response": { "message": "<agent response>" },
  "started_at": "<ISO 8601>",
  "time_to_first_token": 0,
  "time_to_last_token": 0,
  "model_usage": {
    "connector_id": "elastic-console",
    "llm_calls": 1,
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

If the local agent made tool calls, they can be included in `steps` as `tool_call` entries for full fidelity, but this is optional -- an empty `steps` array with just the final response is valid.

### Component 4: Explicit session lookup (optional)

Allow the user to say something like "show me my Kibana sessions" or "continue Kibana session X":

```
user: "show my kibana sessions"
  -> list_conversations()
  -> display titles, dates, IDs

user: "continue session abc-123"
  -> get_conversation("abc-123")
  -> inject rounds into local context
```

This is a convenience feature and not required for the core handover flow.

### Error handling

- **401/403 responses**: The API key may have expired or been revoked. Prompt the user to re-run the Elastic Console setup in Kibana.
- **404 on get/handover**: The conversation was deleted between the list and get calls. Skip it.
- **409 on handover**: Concurrent update conflict (another agent picked it up). Skip it.
- **Network errors**: Log and retry on next poll cycle. Do not crash the poller.
