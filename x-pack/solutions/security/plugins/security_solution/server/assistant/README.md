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

The SIEM agent is created using the `SiemAgentCreator` class in the `Plugin.start()` method of the Security Solution plugin:

```typescript
// In plugin.ts
const siemAgentCreator = createSiemAgentCreator({
  onechatPlugin: plugins.onechat,
  core,
  logger: this.logger,
});
siemAgentCreator.createSiemAgent().catch((error) => {
  this.logger.warn('Failed to create SIEM agent', { error: error.message });
});
```

The `SiemAgentCreator` class is defined in `siem_agent_creator.ts` and encapsulates all the agent creation logic:

```typescript
// In siem_agent_creator.ts
export class SiemAgentCreator {
  async createSiemAgent(): Promise<void> {
    // Creates the agent with specialized configuration
    // Includes error handling and logging
  }
}
```

### Agent Creation Flow

1. **Startup**: During plugin startup, the `SiemAgentCreator` is instantiated and `createSiemAgent` method is called
2. **Existence Check**: Verifies if the agent already exists to avoid duplicates
3. **Tool Registration**: Registers the `open-and-acknowledged-alerts-internal-tool` and `alert-counts-internal-tool`
4. **Agent Creation**: Creates the agent with comprehensive security analysis instructions
5. **Error Handling**: Logs success or failure with appropriate error details

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

### Testing

The implementation includes comprehensive tests in `create_siem_agent.test.ts` that verify:

- Agent creation when it doesn't exist
- Skipping creation when agent already exists
- Proper error handling and logging
- Correct tool configuration

### Customization

The agent can be customized by modifying the `SiemAgentCreator` class in `siem_agent_creator.ts`:

- **Instructions**: Update the `instructions` field for different behavior
- **Tools**: Add or remove tools from the `tools` array
- **Labels**: Modify labels for better organization
- **Avatar**: Change the visual representation

### Security Considerations

- The agent uses a mock request for internal creation (no user context required)
- Tool access is controlled through the onechat tool registry
- All operations are logged for audit purposes
- Error handling prevents plugin startup failures
