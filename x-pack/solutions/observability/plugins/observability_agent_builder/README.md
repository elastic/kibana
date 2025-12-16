# Observability Agent Builder

This plugin provides an observability agent, observability tools and attachments for Agent Builder.

## Feature flag

The agent/tools are hidden behind the shared AI Agents feature flag. It can be enabled via `kibana.yml`:

```yml
feature_flags.overrides:
  aiAssistant.aiAgents.enabled: true
```
