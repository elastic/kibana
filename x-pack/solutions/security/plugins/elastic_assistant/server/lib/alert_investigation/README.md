# LLM-Powered Alert Investigation

Autonomous multi-agent system for investigating security alerts using AI.

## Quick Start

### 1. Enable Feature Flag

```yaml
# config/kibana.dev.yml
xpack.elasticAssistant.llmInvestigationEnabled: true
```

### 2. Configure Claude Connector

Navigate to **Stack Management → Connectors** and create a Claude (Anthropic) connector.

### 3. Trigger Investigation

```typescript
POST /internal/elastic_assistant/alert_investigation
{
  "alertId": "your-alert-id",
  "alertIndex": ".alerts-security.alerts-default",
  "connectorId": "your-claude-connector-id"
}
```

## Architecture

**Foundation Spike: 2 Agents**
1. Triage Agent - Classify severity and attack type
2. MITRE Mapper - Map to ATT&CK framework

**Production: 5 Agents** (Weeks 2-4)
3. CTI Enrichment - Threat intelligence lookup
4. Investigation - Deep analysis and hypothesis testing
5. Remediation - Response recommendations

## Files

```
alert_investigation/
├── agents/              # Individual AI agents
├── graphs/              # LangGraph orchestration
├── helpers/             # Utilities (LLM client, formatters)
├── types/               # TypeScript interfaces
└── README.md            # This file
```

## Testing

```bash
# Run all tests
yarn test:jest alert_investigation

# Run specific test suites
yarn test:jest triage_agent.test.ts
yarn test:jest mitre_mapper_agent.test.ts
```

**Test Coverage:** 30 unit tests

## Documentation

- **[SPIKE.md](../../../../../docs/alert_investigation/SPIKE.md)** - Complete spike documentation
- **[SPIKE_SPEC_LLM_INVESTIGATION.md](../../../../../docs/SPIKE_SPEC_LLM_INVESTIGATION.md)** - Original requirements
- **[Demo Script](../../../../../docs/alert_investigation/demo/demo_script.md)** - How to demo

## Performance

**Target Latency (2 agents):** <30 seconds

**Breakdown:**
- Triage Agent: 5-10s
- MITRE Mapper: 3-5s
- Overhead: ~5s

## Contributing

This is a foundation spike. Production implementation adds 3 more agents in weeks 2-4.

**Production Roadmap:**
- Week 2: CTI Enrichment agent
- Week 3: Investigation agent + Remediation agent
- Week 4: Parallel execution, feedback loop, monitoring
