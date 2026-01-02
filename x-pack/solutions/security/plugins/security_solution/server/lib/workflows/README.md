> **⚠️ DISCLAIMER: Do not add production workflows in this direcory**
>
> **Hardcoding workflows like this is not officially supported yet. Do not do this unless this is exclusivly used for testing**
>
> This implementation exists **only for development and testing purposes**. Workflows should be created and managed through the proper workflows management APIs or UI, system workflows are not supported yet.
>
> **Do not use this pattern as a reference for other features.** If you need workflows to be available by default, consider alternative approaches. Speak to the one-workflow team.

# Preinstalled Workflows

This directory contains preinstalled workflows that are automatically bootstrapped into Kibana when enabled.

**Note:** This implementation is for development and testing purposes only. See disclaimer above.

## Feature Flags

### Enable Preinstalled Workflows Bootstrap

To enable the automatic installation of preinstalled workflows, set the following feature flag in your `kibana.yml`:

```yaml
xpack.securitySolution.preinstalledWorkflows.enabled: true
```

**Note:** The default value is `true`, so workflows will be installed automatically unless explicitly disabled.

### Enable Security Alerts Attachment

To enable security alerts attachment functionality (required for alert_validation_worklfow.yml workflow), set the following feature flag:

```yaml
xpack.aiAssistant.aiAgents.enabled: true
```

Restart Kibana once these feature flags are enabled. This will install the workflows on startup.

## Workflow Actions

### Adding Workflow Action to All Rules

To add a workflow action to all detection rules, use the bulk edit API:

```bash
curl --location 'http://localhost:5601/api/detection_engine/rules/_bulk_action' \
  --header 'kbn-xsrf: true' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --data '{
    "action": "edit",
    "query": "",
    "edit": [
      {
        "type": "add_rule_actions",
        "value": {
          "actions": [
            {
              "id": "system-connector-.workflows",
              "params": {
                "subAction": "run",
                "subActionParams": {
                  "workflowId": "workflow-3cf6d7f4-864f-4722-834d-ae1743f445ee",
                  "summaryMode": false
                }
              }
            }
          ]
        }
      }
    ]
  }'
```

**Parameters:**
- `workflowId`: The ID of the workflow to execute (e.g., `workflow-3cf6d7f4-864f-4722-834d-ae1743f445ee`)
- `summaryMode`: 
  - `false` - Run workflow per alert (executes separately for each individual alert)
  - `true` - Run workflow in summary mode (executes once with all alerts batched together)

**Note:** Replace `http://localhost:5601` with your Kibana URL and update the Authorization header with your credentials.

### Removing Workflow Action from All Rules

To remove workflow actions from all rules, use `set_rule_actions` with an empty actions array:

```bash
curl --location 'http://localhost:5601/api/detection_engine/rules/_bulk_action' \
  --header 'kbn-xsrf: true' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --data '{
    "action": "edit",
    "query": "",
    "edit": [
      {
        "type": "set_rule_actions",
        "value": {
          "actions": []
        }
      }
    ]
  }'
```

**Warning:** This will remove ALL actions from all rules. If you only want to remove workflow actions while keeping other actions, you would need to:
1. Fetch all rules and their current actions
2. Filter out workflow actions (where `id` starts with `system-connector-.workflows`)
3. Use `set_rule_actions` with the filtered actions list

### Dry Run

To test bulk actions without applying changes, add `?dry_run=true` to the URL:

```bash
curl --location 'http://localhost:5601/api/detection_engine/rules/_bulk_action?dry_run=true' \
  ...
```

## Workflow Registry

Preinstalled workflows are registered in `workflow_registry.ts`. Each workflow entry includes:
- `id`: Unique workflow identifier
- `filePath`: Relative path to the workflow YAML file

## Bootstrap Process

The bootstrap process:
1. Checks if the workflows management plugin is available
2. Verifies the feature flag is enabled
3. For each registered workflow:
   - Checks if the workflow already exists
   - Installs new workflows or updates existing ones if the YAML has changed
   - Skips workflows that are unchanged

Bootstrap runs automatically during plugin startup when the feature flag is enabled.

