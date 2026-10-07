# Automation notification lifecycle testing

<details>
<summary>Full manual testing guide: create a Slack app and test the lifecycle locally</summary>

Set these values in your local `config/kibana.dev.yml` before starting Kibana:

```yaml
xpack.nightshift_investigations.enabled: true
server.publicBaseUrl: 'http://localhost:5601'
```

### 1. Prepare the local stack

```sh
pnpm es snapshot --license=trial --eis
```

```sh
pnpm start --no-base-path --eis
```

### 2. Create and install the Slack app

1. Create a test workspace at [Slack’s workspace creation page](https://slack.com/get-started#/createnew): sign in or verify your email, then follow the prompts and name the workspace `Elastic-tester`. If you already have a test workspace, use it instead.
2. Open [Slack's app management page](https://api.slack.com/apps), choose **Create New App**, and select **Blank app** / **From scratch**.
3. Name it `Nightshift Local Test` and choose your test workspace, for example **Elastic-tester**.
4. In **OAuth & Permissions → Bot Token Scopes**, add **`chat:write`**. This is sufficient for posting to a channel the bot has joined.
5. Click **Install to Workspace**, check the workspace, and authorize the app.
6. Copy the **Bot User OAuth Token**.
7. Create a test channel such as `#nightshift-test`, then invite the app with `/invite @Nightshift Local Test`.
8. Copy the channel's ID from its details

See [Slack's app creation guide](https://docs.slack.dev/app-management/quickstart-app-settings/) and [message permission guidance](https://docs.slack.dev/messaging/sending-and-scheduling-messages/).

### 3. Create the saved Kibana connector

1. Open **Stack Management → Connectors → Create connector**.
2. Choose **Slack (v2)** (`.slack2`), name it `Nightshift Slack Test`, and copy its **Connector ID**, for example `nightshift-slack-test`.
3. Select **Bot Token** authentication and paste the `xoxb-` token. Save the connector.
4. Use the connector's connection test to confirm the token is valid and belongs to the intended workspace.

### 4. Start an investigation with a destination

For API testing, use a Kibana session so the scheduled workflow retains the same user profile as the conversation owner. Run these commands from the checkout in one shell:

```sh
export KIBANA_URL=http://localhost:5601
export KIBANA_AUTH=elastic:changeme
export KIBANA_USE_SESSION=true
source scripts/kibana_api_common.sh
```

For a serverless local stack, use `elastic_serverless:changeme` and matching serverless ES/Kibana modes:

```sh
pnpm es serverless --projectType observability --productTier complete --eis
pnpm start --serverless=oblt --no-base-path --eis
```

Complete Vault login if EIS requests it. Wait for the stack to be available. Avoid editing source or running type checks during a live delivery when Kibana's development watcher is enabled, as a restart may interrupt an attempt.

Create `/tmp/nightshift-slack-test.json`, replacing the connector and channel IDs:

```json
{
  "subject": { "type": "manual" },
  "title": "Local Slack lifecycle test",
  "message": "Investigate recent errors and latency in the available telemetry. Summarize the evidence and any limitations.",
  "notificationDestinations": [
    {
      "type": "slack",
      "connector_id": "<saved-slack-connector-id>",
      "params": { "channel": "<slack-channel-id>" },
      "automation_id": "local-manual-test",
      "automation_name": "Local manual test"
    }
  ]
}
```

```sh
kibana_curl --fail-with-body -H 'Content-Type: application/json' \
  --data-binary @/tmp/nightshift-slack-test.json \
  "$KIBANA_URL/internal/nightshift/investigations"
```

Save the returned `investigation_id` in `INVESTIGATION_ID`. This runs the same managed investigation workflow that automations start. For an automation test, create a manual-trigger automation, set completion action `post_to_slack`, target mode `channel`, the saved connector ID and channel ID, then run its generated workflow from Workflows. The generated workflow passes destination configuration; the investigation workflow delivers the lifecycle.

### 5. Verify the root, terminal reply, and routing attachment

```sh
kibana_curl --fail-with-body \
  "$KIBANA_URL/internal/nightshift/investigations/$INVESTIGATION_ID"
```

- The channel receives one **started** root naming the automation and linking to the investigation.
- On agent success, a **completed** message replies to that root, with the available findings, severity, impact, and top recommendation. An agent error sends a **failed** reply with a bounded reason.
- The default-space locator link opens that investigation in Kibana.
- `notify_started` and the applicable terminal step return `{ "sent": 1, "failed": 0, "unconfirmed": 0 }` when delivery succeeds.
- Investigation records and findings still use Saved Objects. Delivery diagnostics are in the hidden, readonly routing attachment, rather than the investigation API response.

Read `conversation_id` from the investigation response and use it as `CONVERSATION_ID`:

```sh
kibana_curl --fail-with-body -H 'elastic-api-version: 2023-10-31' \
  "$KIBANA_URL/api/agent_builder/conversations/$CONVERSATION_ID/attachments"
```

Find the result of type `nightshift.notification_routing`. Its current version's `data` holds destinations, executions, and attempts. Verify:

- Immutable `params.channel` is retained; `thread.channel` and `thread.thread_ts` hold the confirmed outbound thread.
- Started and terminal attempts have their execution/destination/phase identity, random `attempt_id`, timestamps, and `status: "sent"`.
- The root receipt and retained thread timestamp agree; the terminal message has a different timestamp.
- The attachment is hidden and readonly.

### 6. Continue the investigation and verify thread reuse

Create `/tmp/nightshift-slack-continue.json`:

```json
{
  "inputs": {
    "investigation_id": "<investigation-id>",
    "title": "Local Slack lifecycle follow-up",
    "message": "Review the existing investigation findings and explain whether anything changed."
  }
}
```

```sh
kibana_curl --fail-with-body -H 'Content-Type: application/json' \
  -H 'elastic-api-version: 2023-10-31' \
  --data-binary @/tmp/nightshift-slack-continue.json \
  "$KIBANA_URL/api/workflows/workflow/system-nightshift-investigation/run"
```

Use the same session/user that owns the conversation. The response returns a new `workflowExecutionId`. Verify a started reply and terminal reply on the **same** root, a new execution snapshot and attempts, and unchanged root state. You do not need to repeat retained destinations. Automatically grouping independent automation starts is deferred.

### 7. Replay and fan-out

To test replay, use Workflows' **Test step** for `nightshift.sendNotifications` with the same investigation, phase and original execution ID in the execution context. A replay must return persisted counts without adding another Slack message or attempt. Do not test with a different execution ID; that represents a new lifecycle rather than replay.

For a repeatable API replay, create a JSON body for `/api/workflows/step/test` containing:

```json
{
  "stepId": "replay_notifications",
  "workflowYaml": "version: '1'\nname: Notification replay\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: replay_notifications\n    type: nightshift.sendNotifications\n    with:\n      investigation_id: <investigation-id>\n      phase: completed\n",
  "contextOverride": {
    "execution": { "id": "<original-execution-id>" },
    "workflow": { "spaceId": "default" }
  }
}
```

Send it using `kibana_curl`, `Content-Type: application/json`, and `elastic-api-version: 2023-10-31`. Check the returned test execution in Workflows and reread the attachment. A `sent`, `failed`, or `unconfirmed` attempt suppresses replay. An interrupted/uncertain root with no confirmed timestamp also blocks automatic creation of a replacement root in later executions; dependent terminal delivery records a missing-thread diagnostic. A definitely failed root may receive a fresh started attempt in a later execution.

For fan-out, supply two explicitly authorized test destinations. Verify one root and terminal reply per distinct endpoint. Duplicate endpoint parameters in a different key order deduplicate, while different automation IDs remain attributed to the retained destination. A later continuation includes all retained destinations.

For failure isolation, use an additional invalid connector ID alongside the authorized valid destination. The missing connector records an `unconfirmed` attempt and diagnostic, the valid one still receives its lifecycle, and the agent result continues independently. Connector error responses record `failed` outcomes. The failed-phase sender and cancellation/persistence interruption cases also have focused regression tests.

For a non-default space, create the saved connector there and prefix API URLs with `/s/<space-id>`. The locator link and Actions execution must use that space.

Outbound thread references do not enable Slack replies to continue investigations. Incoming-thread lookup and continuation remain with the Slack flow owners.

</details>
