# Security Solution Assistant Tools and Agents

This directory contains the assistant tools and agent configurations for the Security Solution plugin.

## SIEM Agent

The Security Solution plugin automatically creates a specialized SIEM agent during startup that provides AI-powered security analysis capabilities.

### Agent Details

- **ID**: `siem-security-analyst`
- **Name**: SIEM Security Analyst
- **Description**: AI assistant specialized in security analysis and threat detection for SIEM operations
- **Labels**: `['security', 'siem', 'threat-detection', 'incident-response']`
- **Avatar**: Red shield emoji (🛡️) with color `#ff6b6b`

### Capabilities

The SIEM agent is configured with the following capabilities:

1. **Threat Detection**: Analyze security alerts and identify potential threats
2. **Incident Response**: Provide guidance on responding to security incidents
3. **Alert Analysis**: Help investigate and triage security alerts
4. **Security Monitoring**: Assist with continuous security monitoring activities
5. **Threat Intelligence**: Provide context about known threats and attack patterns

### Tools

The agent has access to the following tools:

1. **Open and Acknowledged Alerts Tool** (`.open-and-acknowledged-alerts-internal-tool`)
   - Queries open and acknowledged alerts from the security index
   - Provides alert details with risk scores and metadata
   - Supports anonymization for privacy compliance

2. **Alert Counts Tool** (`.alert-counts-internal-tool`)
   - Queries alert counts for the last 24 hours
   - Groups alerts by severity and workflow status
   - Provides aggregated data for security analysis

3. **Entity Risk Score Tool** (`.entity-risk-score-tool-internal`)
   - Queries entity risk scores and contributing factors
   - Provides detailed risk analysis for hosts, users, and IPs
   - Includes anonymization support for privacy compliance

4. **Built-in Tools** (`builtin` type with `*` wildcard)
   - All standard onechat built-in tools
   - Includes data retrieval and analysis capabilities

5. **ES|QL Tools** (`esql` type with `*` wildcard)
   - Elasticsearch query language tools
   - Enables complex data analysis and aggregation

### Implementation

The SIEM agent is registered using the new onechat registry mechanism in the `Plugin.setup()` method of the Security Solution plugin:

```typescript
// In plugin.ts
import { siemAgentCreator } from './assistant/siem_agent_creator';

// During setup phase
plugins.onechat.agents.register(siemAgentCreator());
```

The `siemAgentCreator` factory function is defined in `siem_agent_creator.ts` and returns a `BuiltInAgentDefinition`:

```typescript
// In siem_agent_creator.ts
export const siemAgentCreator = (): BuiltInAgentDefinition => {
  return {
    id: 'siem-security-analyst',
    name: 'SIEM Security Analyst',
    description: DEFAULT_SYSTEM_PROMPT,
    labels: ['security', 'siem', 'threat-detection', 'incident-response'],
    avatar_color: '#ff6b6b',
    avatar_symbol: '🛡️',
    configuration: {
      instructions: '...',
      tools: [...]
    }
  };
};
```

### Agent Registration Flow

1. **Setup Phase**: During plugin setup, the agent definition is registered with the onechat agent registry
2. **Static Definition**: The agent is defined statically as a `BuiltInAgentDefinition` object
3. **Tool References**: The agent configuration references tools by their IDs
4. **Automatic Management**: The onechat plugin handles agent lifecycle and persistence

### Usage

Once created, the SIEM agent can be accessed through the onechat API:

```bash
# Converse with the SIEM agent
POST /api/chat/converse
{
  "agent_id": "siem-security-analyst",
  "input": "Analyze the latest security alerts"
}
```

### Customization

The agent can be customized by modifying the `siemAgentCreator` factory function in `siem_agent_creator.ts`:

- **Instructions**: Update the `instructions` field in the configuration for different behavior
- **Tools**: Add or remove tool IDs from the `tools` array
- **Labels**: Modify labels for better organization
- **Avatar**: Change the `avatar_symbol` and `avatar_color` properties

### Security Considerations

- The agent is registered at setup time with a static definition
- Tool access is controlled through the onechat tool registry
- All registered tools must be available in the tool registry before use
- The agent definition is read-only and cannot be modified by users
