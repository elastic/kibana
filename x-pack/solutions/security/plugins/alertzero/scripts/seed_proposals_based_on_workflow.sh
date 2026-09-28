#!/usr/bin/env bash
set -euo pipefail

# Fills the AlertZero home queue with the eleven open proposals from the design
# prototype — five Respond, two Investigate, four Configure. Closed rows are not
# seeded: they need a decision, which this script does not make.
#
# Every proposal also gets attachments, so the investigation flyout's Attachment
# summary has something to show. Four extra conversations after the eleven cover
# the cases a realistic investigation does not reach: the collapse toggle, the
# five-row boundary, excluded types, and category ordering.
#
# Three steps:
#   1. Installs the "Create proposed action" test-helper workflow (idempotent:
#      it is created under a fixed id, and updated in place on a re-run).
#   2. Creates a conversation per proposal and attaches to it. The script owns
#      the conversation rather than letting the workflow create one, because
#      attaching needs an id the workflow never hands back.
#   3. Fires the workflow against that conversation, so the proposal lands on
#      the same card.
#
# Attachments are seeded by value, never by reference: `security.rule` and
# `security.attack_discovery` resolve an `origin` against the rules client and
# the attack-discovery index respectively, and reject ids that do not exist.
# Passing `data` skips that lookup, so nothing has to be seeded in those indices.
#
# IMPORTANT — this does not work on an unpatched checkout. The helper reaches the
# queue through `workflow.execute` on `system-create-proposal`,
# which is a managed, global workflow. The engine only resolves those for a
# managed *parent* run, so a manual run of this helper fails with
# `Workflow not found: "system-create-proposal"`. To seed locally,
# force the parent to count as managed in
# `src/platform/plugins/shared/workflows_execution_engine/server/step/workflow_execute_step/workflow_execute_step_impl.ts`:
#
#   private async getWorkflow(workflowId: string): Promise<EsWorkflow | null> {
#     const isManagedParentRun = true; // was: this.isManagedParentExecution();
#
# That edit is local-only — do not commit it.
#
# Three descriptions below are truncated with "…", exactly as the prototype
# renders them. They are seeded verbatim rather than invented.
#
# Prerequisites:
#   - Kibana running at $KIBANA_URL with the alertzero plugin enabled
#   - Elasticsearch running at $ES_URL (default: http://localhost:9200)
#   - The workflows and workflows_execution_engine plugins enabled
#   - curl and jq on PATH
#
# Usage:
#   bash x-pack/solutions/security/plugins/alertzero/scripts/seed_proposals_based_on_workflow.sh \
#     [--url http://localhost:5601/kbn] [--es-url http://localhost:9200] \
#     [--user elastic] [--password changeme] [--space default]

KIBANA_URL="${KIBANA_URL:-http://localhost:5601/kbn}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
KIBANA_SPACE="${KIBANA_SPACE:-default}"
ES_URL="${ES_URL:-http://localhost:9200}"

# Shared by the workflows, conversations and attachments APIs.
KIBANA_API_VERSION="2023-10-31"
WORKFLOW_ID="alertzero-seed-create-proposed-action"

usage() {
  cat <<'USAGE'
Seeds the AlertZero queue with the prototype's open proposals, each with the
attachments its investigation flyout should list, plus four conversations that
cover the attachment summary's edge cases.

Options:
  --url URL           Kibana base URL, base path included (default: http://localhost:5601/kbn)
  --es-url URL        Elasticsearch base URL (default: http://localhost:9200)
  --user USER         Kibana user (default: elastic)
  --password PASS     Kibana password (default: changeme)
  --space SPACE       Kibana space (default: default)
  -h, --help          Show this help

Each option also reads from its environment variable: KIBANA_URL, ES_URL,
KIBANA_USER, KIBANA_PASSWORD, KIBANA_SPACE. The flag wins.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --url) KIBANA_URL="$2"; shift 2 ;;
    --es-url) ES_URL="$2"; shift 2 ;;
    --user) KIBANA_USER="$2"; shift 2 ;;
    --password) KIBANA_PASSWORD="$2"; shift 2 ;;
    --space) KIBANA_SPACE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

for tool in curl jq; do
  if ! command -v "$tool" > /dev/null 2>&1; then
    echo "Missing required tool: $tool" >&2
    exit 1
  fi
done

# Strip trailing slashes, so the URLs below never double up on them.
KIBANA_URL="${KIBANA_URL%/}"
ES_URL="${ES_URL%/}"

if [ "$KIBANA_SPACE" = "default" ]; then
  KIBANA_API_BASE="${KIBANA_URL}"
else
  KIBANA_API_BASE="${KIBANA_URL}/s/${KIBANA_SPACE}"
fi

# Security alerts live in a space-scoped alias; the write goes to the backing
# index and ES returns that backing index name in _index, which is what the
# flyout descriptor needs.
ALERT_INDEX=".alerts-security.alerts-${KIBANA_SPACE}"

kibana_curl() {
  curl --silent --fail-with-body \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${KIBANA_API_VERSION}" \
    "$@"
}

es_curl() {
  curl --silent --fail-with-body \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    -H "Content-Type: application/json" \
    "$@"
}

# ---- conversations and attachments -----------------------------------------

# The conversation the `attach_*` helpers below append to. Set by
# `seed_conversation`, which every seeded conversation goes through, so the call
# sites read as a list of attachments under the proposal they belong to.
CONVERSATION_ID=""

# Counter behind the fabricated alert / rule / discovery ids. They only have to
# be unique and stable-looking; nothing resolves them.
#
# Uses a temp file so the counter survives subshell boundaries (command substitution
# $(…) forks a subshell — assignments to a plain variable would be lost).
SEED_SEQ_FILE="$(mktemp "${TMPDIR:-/tmp}/alertzero-seed-seq.XXXXXX")"
printf '0' > "$SEED_SEQ_FILE"

next_seed_id() {
  local seq
  seq="$(cat "$SEED_SEQ_FILE")"
  seq=$((seq + 1))
  printf '%d' "$seq" > "$SEED_SEQ_FILE"
  printf 'seed-%03d' "$seq"
}

seed_conversation() {
  local title="$1" summary="$2"
  CONVERSATION_ID=$(
    kibana_curl -X POST "${KIBANA_API_BASE}/api/agent_builder/conversations" \
      -d "$(jq -n --arg title "$title" --arg summary "$summary" \
        '{
          title: $title,
          template_id: "investigation",
          access_control: { access_mode: "public" },
          metadata: { status: "open", summary: $summary }
        }')" \
      | jq -r '.id'
  )
}

# Warns instead of aborting: `security.attack_discovery` is registered by the
# discoveries plugin only when `securitySolution.attackDiscoveryWorkflowsEnabled`
# is on, and one missing type should not cost you the rest of the seed.
attach() {
  local type="$1" data="$2" response
  if ! response=$(
    kibana_curl -X POST \
      "${KIBANA_API_BASE}/api/agent_builder/conversations/${CONVERSATION_ID}/attachments" \
      -d "$(jq -n --arg type "$type" --argjson data "$data" '{ type: $type, data: $data }')" 2>&1
  ); then
    echo "      ! ${type} not attached: ${response}" >&2
  fi
}

# Reads its label from `data.title`; `attachmentLabel` is stripped by its schema.
attach_attack() {
  local title="$1"
  attach security.attack_discovery "$(jq -n --arg title "$title" --arg id "$(next_seed_id)" \
    '{
      id: $id,
      title: $title,
      summary_markdown: ("Seeded attack discovery: " + $title),
      details_markdown: ("## " + $title + "\n\nSeeded by seed_proposals_based_on_workflow.sh."),
      alert_ids: []
    }')"
}

severity_to_risk_score() {
  case "$1" in
    critical) echo 99 ;;
    high)     echo 73 ;;
    low)      echo 21 ;;
    *)        echo 47 ;; # medium
  esac
}

# Optional second arg: severity (default: medium). Valid: low | medium | high | critical.
index_seed_alert() {
  local label="$1" severity="${2:-medium}"
  local id now response risk_score
  id="$(next_seed_id)"
  now="$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')"
  risk_score="$(severity_to_risk_score "$severity")"

  if ! response=$(
    es_curl -X PUT \
      "${ES_URL}/${ALERT_INDEX}/_doc/${id}" \
      -d "$(jq -n \
        --arg id "$id" \
        --arg label "$label" \
        --arg now "$now" \
        --arg space "$KIBANA_SPACE" \
        --arg severity "$severity" \
        --argjson risk_score "$risk_score" \
        '{
          "@timestamp": $now,
          "event.kind": "signal",
          "kibana.alert.uuid": $id,
          "kibana.alert.rule.uuid": "seed-rule-0000-0000-0000-000000000001",
          "kibana.alert.rule.name": $label,
          "kibana.alert.rule.rule_type_id": "siem.queryRule",
          "kibana.alert.status": "active",
          "kibana.alert.workflow_status": "open",
          "kibana.space_ids": [$space],
          "kibana.alert.start": $now,
          "kibana.alert.severity": $severity,
          "kibana.alert.risk_score": $risk_score
        }')" 2>&1
  ); then
    echo "      ! ${label}: ES indexing failed — ${response}" >&2
    return 1
  fi

  # Print the id we assigned (not the backing-index id — the alias resolves it).
  printf '%s' "$id"
}

# Optional second arg: severity (default: medium). Valid: low | medium | high | critical.
attach_alert() {
  local label="$1" severity="${2:-medium}"
  local id now index_response alert_index risk_score
  id="$(next_seed_id)"
  now="$(date -u '+%Y-%m-%dT%H:%M:%S.000Z')"
  risk_score="$(severity_to_risk_score "$severity")"

  if ! index_response=$(
    es_curl -X PUT \
      "${ES_URL}/${ALERT_INDEX}/_doc/${id}" \
      -d "$(jq -n \
        --arg id "$id" \
        --arg label "$label" \
        --arg now "$now" \
        --arg space "$KIBANA_SPACE" \
        --arg severity "$severity" \
        --argjson risk_score "$risk_score" \
        '{
          "@timestamp": $now,
          "event.kind": "signal",
          "kibana.alert.uuid": $id,
          "kibana.alert.rule.uuid": "seed-rule-0000-0000-0000-000000000001",
          "kibana.alert.rule.name": $label,
          "kibana.alert.rule.rule_type_id": "siem.queryRule",
          "kibana.alert.status": "active",
          "kibana.alert.workflow_status": "open",
          "kibana.space_ids": [$space],
          "kibana.alert.start": $now,
          "kibana.alert.severity": $severity,
          "kibana.alert.risk_score": $risk_score
        }')" 2>&1
  ); then
    echo "      ! ${label}: ES indexing failed — ${index_response}" >&2
    return
  fi

  alert_index="$(echo "$index_response" | jq -r '._index')"

  attach security.alert "$(jq -n \
    --arg label "$label" \
    --arg id "$id" \
    --arg index "$alert_index" \
    --arg severity "$severity" \
    '{
      attachmentLabel: $label,
      alert: ({ _id: $id, _index: $index, "kibana.alert.rule.name": $label, "kibana.alert.severity": $severity } | tojson)
    }')"
}

# The schema caps the batch at 20.
# Optional third arg: severity for all alerts in the batch (default: medium).
attach_alerts() {
  local count="$1" label="${2:-Alert}" severity="${3:-medium}"
  local i id ids=()

  for i in $(seq 1 "$count"); do
    if id="$(index_seed_alert "${label} ${i}" "$severity")"; then
      ids+=("$id")
    fi
  done

  if [ "${#ids[@]}" -eq 0 ]; then
    echo "      ! attach_alerts: no documents indexed, skipping attachment" >&2
    return
  fi

  attach security.alerts "$(printf '%s\n' "${ids[@]}" | jq -R . | jq -s '{ alertIds: . }')"
}

attach_rule() {
  local name="$1" id
  id="$(next_seed_id)"
  attach security.rule "$(jq -n --arg name "$name" --arg id "$id" \
    '{
      attachmentLabel: $name,
      text: ({
        id: $id,
        rule_id: $id,
        name: $name,
        type: "query",
        query: "event.category:authentication and event.outcome:failure"
      } | tojson)
    }')"
}

# Without `attachmentLabel` a single entity renders as the literal "Risk Entity".
# `{type}: {identifier}` is the convention the entity tools use.
attach_entity() {
  local identifier_type="$1" identifier="$2"
  attach security.entity "$(jq -n --arg t "$identifier_type" --arg i "$identifier" \
    '{ identifierType: $t, identifier: $i, attachmentLabel: ($t + ": " + $i) }')"
}

attach_alert_group() {
  local ids=()
  local label severity id
  while [ $# -ge 2 ]; do
    label="$1" severity="$2"
    shift 2
    if id="$(index_seed_alert "$label" "$severity")"; then
      ids+=("$id")
    fi
  done
  if [ "${#ids[@]}" -eq 0 ]; then
    echo "      ! attach_alert_group: no documents indexed, skipping attachment" >&2
    return
  fi
  attach security.alerts "$(printf '%s\n' "${ids[@]}" | jq -R . | jq -s '{ alertIds: . }')"
}

# Deliberately NOT in the summary. Seeded only to prove the filter drops it —
# it is the type most easily mistaken for `security.entity`.
attach_entity_graph() {
  local identifier_type="$1" identifier="$2"
  attach security.entity_graph "$(jq -n --arg t "$identifier_type" --arg i "$identifier" \
    '{
      identifierType: $t,
      identifier: $i,
      entityStoreId: ($t + ":" + $i),
      timeRange: { from: "now-24h", to: "now" }
    }')"
}

# ---- 1. install the helper workflow ----------------------------------------

# Explicit template: GNU mktemp rejects `-t` without one.
WORKFLOW_YAML_FILE="$(mktemp "${TMPDIR:-/tmp}/alertzero-seed-workflow.XXXXXX")"
trap 'rm -f "$WORKFLOW_YAML_FILE" "$SEED_SEQ_FILE"' EXIT

cat > "$WORKFLOW_YAML_FILE" <<'WORKFLOW_YAML'
version: "1"
name: Create proposed action
description: >
  Test helper for the investigation proposal queue. Creates a proposal through
  the managed gate workflow, filling in anything you leave out — run it with no
  inputs at all and you get a realistic create-rule proposal awaiting a
  decision. Pass any field to override just that one. Fire-and-forget: it
  returns as soon as the gate has parked, so the proposal is in the queue and
  this run does not sit waiting for the decision.
enabled: true
tags:
  - alertzero
  - proposals
  - test-data

consts:
  # Its own `actionMetadata` declares category `configure` and impact `low`,
  # which is why neither has to be passed below. The rule is always created
  # disabled, so approving a test proposal cannot start real alerting.
  default_action_workflow_id: system-alertzero-action-create-rule
  # Broad enough to exist on any local stack. The rule is never enabled, so
  # nothing runs against it.
  default_rule_index: "logs-*"

triggers:
  - type: manual
    inputs:
      properties:
        conversationId:
          type: string
          description: >
            Conversation to attach the proposal to. Defaults to this run's own
            execution id, which is unique per run — pass a real Agent Builder
            conversation id if you want the proposal to show up in that
            conversation's attachments too.
        conversationTitle:
          type: string
          description: >
            Conversation title
        comment:
          type: string
          description: Markdown shown to the analyst. Defaults to a worked create-rule example.
        actionWorkflowId:
          type: string
          description: Action to run on approval. Defaults to the create detection rule action.
        actionInput:
          type: object
          additionalProperties: true
          description: >
            Input for that action. Defaults to a complete custom query rule.
            Must match the action you chose if you override either.
        impact:
          type: string
          enum: ['low', 'medium', 'high', 'critical']
          description: Overrides the action's own declared impact. Left out, the action decides.
        category:
          type: string
          description: Overrides the action's own declared category. Left out, the action decides.
        confidence:
          type: string
          enum: ['low', 'medium', 'high']
          description: Confidence in the recommendation. Defaults to medium.
        autoApprove:
          type: boolean
          description: >
            Skips the human gate, so the action runs immediately and the
            proposal lands already approved. Useful for testing the executed
            states rather than the queue. Defaults to false.
      additionalProperties: false

outputs:
  - name: proposalExecutionId
    type: string
  - name: conversationId
    type: string

steps:
  # A real Agent Builder conversation rather than a synthetic id, so the
  # proposal also shows up in that conversation's attachments instead of only
  # in the windowed queue. First, because everything below hangs off its id.
  - name: new_conversation
    type: if
    condition: "${{ inputs.conversationId == blank }}"
    steps:
      - name: create_investigation
        type: ai.conversation.create
        with:
          title: "{{ inputs.conversationTitle | default: 'Dummy Title' }}"
          access_control:
            access_mode: public
          template_id: investigation
          metadata:
            status: open
            description: "dummy convo description"
            workflow_execution_id: "{{ execution.id }}"

      # Separate step: Liquid cannot read a variable written by the same data.set.
      - name: adopt_new_conversation
        type: data.set
        with:
          conversation_id: "{{ steps.create_investigation.output.conversation_id }}"

  - name: caller_conversation
    type: if
    condition: "${{ inputs.conversationId != blank }}"
    steps:
      - name: adopt_caller_conversation
        type: data.set
        with:
          conversation_id: "{{ inputs.conversationId }}"

  # `default` substitutes for nil *and* for the empty string Liquid renders
  # when an input is absent, so an omitted field and a blank one behave alike.
  #
  # `impact` and `category` are deliberately passed through untouched: blank
  # means "let the action workflow's own metadata decide", which is the path
  # worth exercising here.
  - name: resolve_fields
    type: data.set
    with:
      action_workflow_id: "{{ inputs.actionWorkflowId | default: consts.default_action_workflow_id }}"
      confidence: "{{ inputs.confidence | default: 'medium' }}"
      impact: "{{ inputs.impact | default: 'low' }}"
      category: "{{ inputs.category }}"
      auto_approve: "${{ inputs.autoApprove == true }}"

  # A `data.set` cannot leave a key out, so anything with a non-scalar or
  # multi-line default gets its own pair of branches rather than a filter.
  - name: default_comment
    type: if
    condition: "${{ inputs.comment == blank }}"
    steps:
      - name: set_default_comment
        type: data.set
        with:
          comment: |
            **Create a detection rule for repeated failed logons from one source**

            The investigation traced this alert to a burst of failed
            authentications from a single external address against several
            accounts, which no existing rule covers. A custom query rule would
            catch the pattern directly next time rather than leaving it to be
            reconstructed by hand.

            The rule is created **disabled**, so approving this does not start
            alerting until someone turns it on.

            | Detail | Value |
            | --- | --- |
            | Rule | Repeated failed logons from one source |
            | Query | `event.category:authentication and event.outcome:failure` |
            | Index | `logs-*` |
            | Severity | Medium |
            | Enabled on creation | No |

  - name: caller_comment
    type: if
    condition: "${{ inputs.comment != blank }}"
    steps:
      - name: set_caller_comment
        type: data.set
        with:
          comment: "{{ inputs.comment }}"

  - name: default_action_input
    type: if
    condition: "${{ inputs.actionInput == blank }}"
    steps:
      - name: set_default_action_input
        type: data.set
        with:
          action_input:
            name: "Repeated failed logons from one source"
            description: "Detects a burst of failed authentications from a single source address against multiple accounts. Created from a test proposal."
            query: "event.category:authentication and event.outcome:failure"
            index:
              - "{{ consts.default_rule_index }}"
            severity: medium
            risk_score: 47

  - name: caller_action_input
    type: if
    condition: "${{ inputs.actionInput != blank }}"
    steps:
      - name: set_caller_action_input
        type: data.set
        with:
          action_input: "${{ inputs.actionInput }}"

  # Async, or this run stays `waiting_for_child` for the gate's whole 72 h wait —
  # and dies at the engine's 6 h default timeout long before that, cancelling the
  # gate on its way out and stranding the proposal as undecidable.
  - name: create_proposal
    type: workflow.executeAsync
    with:
      workflow-id: system-create-proposal
      inputs:
        conversationId: "{{ variables.conversation_id }}"
        comment: "{{ variables.comment }}"
        actionWorkflowId: "{{ variables.action_workflow_id }}"
        actionInput: "${{ variables.action_input }}"
        impact: "{{ variables.impact }}"
        category: "{{ variables.category }}"
        confidence: "{{ variables.confidence }}"
        autoApprove: "${{ variables.auto_approve }}"

  # The gate's own execution, not the proposal: this run no longer waits for one.
  - name: emit_result
    type: workflow.output
    status: completed
    with:
      gate: "{{ steps.create_proposal.output }}"
WORKFLOW_YAML

echo "Installing workflow \"${WORKFLOW_ID}\" on ${KIBANA_API_BASE}…"

if kibana_curl -o /dev/null "${KIBANA_API_BASE}/api/workflows/workflow/${WORKFLOW_ID}"; then
  kibana_curl -X PUT \
    "${KIBANA_API_BASE}/api/workflows/workflow/${WORKFLOW_ID}" \
    -d "$(jq -n --rawfile yaml "$WORKFLOW_YAML_FILE" '{ yaml: $yaml }')" \
    > /dev/null
  echo "  already installed — updated in place."
else
  kibana_curl -X POST \
    "${KIBANA_API_BASE}/api/workflows/workflow" \
    -d "$(jq -n --rawfile yaml "$WORKFLOW_YAML_FILE" --arg id "$WORKFLOW_ID" '{ yaml: $yaml, id: $id }')" \
    > /dev/null
  echo "  created."
fi

# ---- 2. fire it once per open proposal -------------------------------------

# The category input overrides what the action workflow declares, which is what
# puts each proposal in the bucket the prototype shows it in.
#
# Creates the conversation first, then hands its id to the workflow so the
# proposal lands on it. The workflow's `caller_conversation` branch adopts the id
# instead of creating its own — which also means these conversations carry no
# `metadata.workflow_execution_id`, since only the creating branch fills it in.
#
# Leaves $CONVERSATION_ID on the new conversation, so the `attach_*` calls that
# follow each `fire` land on it.
fire() {
  local category="$1" title="$2" summary="$3" comment="$4" execution_id

  seed_conversation "$title" "$summary"

  execution_id=$(
    kibana_curl -X POST \
      "${KIBANA_API_BASE}/api/workflows/workflow/${WORKFLOW_ID}/run" \
      -d "$(jq -n \
        --arg cid "$CONVERSATION_ID" \
        --arg title "$title" \
        --arg comment "$comment" \
        --arg category "$category" \
        '{
          inputs: {
            conversationId: $cid,
            conversationTitle: $title,
            comment: $comment,
            category: $category
          }
        }')" \
      | jq -r '.workflowExecutionId'
  )
  echo "  [${category}] ${title}"
  echo "      conversation ${CONVERSATION_ID} · execution ${execution_id}"
}

echo ""
echo "NOTE: the queue is built from proposals, not conversations. Without the"
echo "      workflow_execute_step_impl.ts patch described at the top of this"
echo "      script, the runs below still report an execution id but their"
echo "      create_proposal step fails, and no new cards appear in the queue."
echo "      The conversations and their attachments are created either way, so"
echo "      you can still reach the flyout through Agent Builder."

echo ""
echo "Creating 11 open proposals…"

# The attachments under each proposal are the ones that investigation would
# plausibly have collected. The first two are the fullest; the rest stay at one
# to three, which is the range the design work settled on as typical.

fire respond \
  "Impossible travel — exec account (cfo@corp)" \
  "At 13:02 UTC cfo@corp signed in from Boston, US; at 13:41 a second sign-in landed from a hosting/VPN ASN ~7,000 km away. MFA was satisfied both times, so a naive read is \"impossible travel, but MFA held\". The tell is that the second sign-in replayed the same session cookie rather than completing a fresh challenge — the signature of an adversary-in-the-middle session-token theft." \
  "MFA was satisfied from two countries in 40 minutes — a replayed session cookie. Elastic Defend on the CFO's laptop shows an unsigned launch agent reading the bro…"
attach_attack "Impossible travel — exec account (cfo@corp)"
attach_alert_group \
  "Impossible travel — two sign-ins, 40 min apart" high \
  "Session cookie replayed, no fresh MFA" critical \
  "Second sign-in from bulletproof hosting ASN" medium
attach_entity user "cfo@corp"
attach_entity service "okta-sso"

fire respond \
  "Kerberoasting against service accounts — fin-dc-01" \
  "Nineteen SPN ticket requests for svc-helpdesk and svc-backup arrived within four minutes from fin-ws-31, every one of them downgraded to RC4. The downgrade is the point: RC4 tickets are cheap to crack offline, so the requests are a harvest rather than ordinary service use." \
  "19 SPN ticket requests for svc-helpdesk and svc-backup in four minutes from fin-ws-31, all downgraded to RC4 — offline cracking is the point."
attach_attack "Kerberoasting against service accounts — fin-dc-01"
attach_alerts 19 "Kerberoasting SPN request" high
attach_entity host "fin-dc-01"
attach_entity host "fin-ws-31"
attach_entity user "svc-helpdesk"

fire respond \
  "[seed] Batch alert rows — 7 clickable" \
  "Seven real alert documents in a security.alerts batch, plus an attack, a rule, and three entities (6 attachments total). The summary collapses to 5 with \"Show more (1)\", expands to all 6. Every alert row opens the Security alert flyout for its own document." \
  "7 real ES alert docs as a security.alerts batch + attack + rule + 3 entities — collapse toggle visible, each alert row clickable."
attach_attack "Kerberoasting against service accounts"
attach_alerts 7 "Kerberoasting SPN downgrade" high
attach_rule "Detect RC4 downgrade in Kerberos tickets"
attach_entity host "fin-dc-01"
attach_entity host "fin-ws-31"
attach_entity user "svc-helpdesk"

fire respond \
  "Suspicious OAuth consent — hr-admin" \
  "hr-admin granted the finance-sync application Mail.ReadWrite and offline_access against the payroll mailbox. There is no change ticket, and the publisher was verified only this morning — a combination that usually means the app was stood up for this grant." \
  "hr-admin granted finance-sync Mail.ReadWrite and offline_access on the payroll mailbox — no ticket, publisher verified this morning."
attach_alert "OAuth consent granted to newly verified publisher" medium
attach_entity user "hr-admin"

fire respond \
  "Backup retention rewritten — svc-backup" \
  "Finance backup retention was cut from 35 days to 1 by svc-backup with no change ticket behind it. Two restore points have already aged out under the new policy, so the window for an uncontaminated restore is closing." \
  "Finance backup retention cut 35 days → 1 by svc-backup, no change ticket. Two restore points already aged out."
attach_alert "Backup retention policy reduced 35d → 1d" high
attach_entity user "svc-backup"

fire respond \
  "Data staging detected — FIN-DB-02" \
  'A 4.2 GB archive was assembled in C:\temp on FIN-DB-02 out of finance exports. Nothing has left the host yet, so this is staging rather than exfiltration — which is also why it is worth acting on now.' \
  'A 4.2 GB archive was assembled in C:\temp on FIN-DB-02 from finance exports. Nothing has left the host yet — staged, not exfiltrated.'
attach_attack "Data staging detected — FIN-DB-02"
attach_alert "Large archive assembled from finance exports" high
attach_entity host "FIN-DB-02"

fire investigate \
  "KRBTGT password age — fin-dc-01" \
  "KRBTGT was last rotated 412 days ago, so a golden ticket forged tonight would still validate against the domain. Nothing indicates one has been, which is exactly why this is worth proving before it matters." \
  "KRBTGT last rotated 412 days ago — a forged ticket from tonight would still validate. Worth proving before it matters."
attach_entity host "fin-dc-01"

fire investigate \
  "Suspicious OAuth consent grant" \
  "The consent itself is already revoked. What remains open is the installer the application pushed to jdoe's workstation: it has not been retrieved or analysed, and nothing downstream should run until it has been." \
  "Consent is already revoked. The open question is the installer the app pushed to jdoe's workstation — retrieve it from jdoe-ws-17 for analysis before anything else runs."
attach_alert "Installer delivered by consented OAuth app" medium
attach_entity host "jdoe-ws-17"
attach_entity user "jdoe"

fire configure \
  "Suspicious OAuth consent — hr-admin" \
  "An hr-admin grant of Graph mail scopes should not be possible without admin review. Requiring admin consent for those scopes closes the path this investigation came in through." \
  "Require admin consent for Graph mail scopes so an hr-admin grant cannot recur."
attach_rule "Require admin consent for Graph mail scopes"
attach_entity user "hr-admin"

fire configure \
  'Noisy rule — "After-hours service-account logon"' \
  "The rule fires every night on svc-backup's 01:30 backup window: 640 alerts in 30 days and not one true positive. An Elastic Defend event filter scoped to the backup agent's child process removes the noise without weakening the rule elsewhere." \
  "Fires every night on svc-backup's 01:30 backup window — 640 alerts in 30 days, zero true positives. An Elastic Defend event filter on the backup agent's child proces…"
attach_rule "After-hours service-account logon"
attach_alerts 20 "After-hours service-account logon" low
attach_entity user "svc-backup"

fire configure \
  'Noisy rule — "Backup agent mass file read"' \
  "This rule is 61% of the week's alert volume with zero confirmed true positives across 30 days. A Defend trusted application entry for the signed backup agent clears it outright." \
  "61% of this week's volume, zero confirmed true positives in 30 days. A Defend trusted application for the signed backup agent clears it."
attach_rule "Backup agent mass file read"
attach_alerts 15 "Backup agent mass file read" low

fire configure \
  'Noisy rule — "Unusual port for process"' \
  'The rule fired 1,240 times in 24 hours and every hit traces back to the authorized Qualys scanner sweeping the DMZ. There have been no analyst-confirmed true positives in the retention window.' \
  'The "Unusual port for process" rule fired 1,240× in 24h — every hit traces to the authorized Qualys scanner sweeping the DMZ. Zero analyst-confirmed true positives i…'
attach_rule "Unusual port for process"
attach_alerts 20 "Unusual port for process" low

# ---- 3. attachment summary edge cases ---------------------------------------

# These go through `fire` too, so they land in the queue as ordinary cards and
# their flyout is one click away. The category is arbitrary; they are grouped
# under Configure only so they sit together.

echo ""
echo "Creating 4 attachment-summary edge cases…"

fire configure \
  "[seed] Attachment summary — 12 rows" \
  "Twelve listable attachments across all four groups. The summary should collapse to the first five and offer \"Show more (7)\"." \
  "Seeded to exercise the attachment summary's collapse behaviour. Not a real proposal."
attach_attack "Credential theft chain on LAPTOP-SALES04"
attach_alert_group \
  "Suspicious PowerShell spawned by Word" high \
  "LSASS handle opened by unsigned binary" critical \
  "Scheduled task created in user context" medium \
  "Outbound beacon to newly registered domain" high \
  "Defender exclusion added for user temp path" medium \
  "Clipboard capture module loaded" low
attach_rule "Suspicious PowerShell spawned by Office"
attach_entity host "LAPTOP-SALES04"
attach_entity user "sales.rep@corp"
attach_entity service "m365-exchange"
attach_entity generic "corp-vpn-gw"

fire configure \
  "[seed] Attachment summary — exactly 5 rows" \
  "Exactly five listable attachments — the boundary. All five rows should show with no \"Show more\" toggle at all." \
  "Seeded to pin the five-row boundary of the attachment summary. Not a real proposal."
attach_attack "Lateral movement from FIN-WS-02"
attach_alert_group \
  "SMB session to three hosts in 90 seconds" high \
  "Admin share written by non-admin process" high
attach_rule "Lateral movement via admin shares"
attach_entity host "FIN-WS-02"

fire configure \
  "[seed] Attachment summary — excluded types only" \
  "Two attachments, both of a type the summary deliberately does not list. The Attachment summary heading should not render at all." \
  "Seeded to prove excluded attachment types do not reach the summary. Not a real proposal."
attach_entity_graph host "EXCLUDED-HOST-01"
attach_entity_graph user "excluded.user@corp"

fire configure \
  "[seed] Attachment summary — ordering" \
  "One attachment per group, attached in reverse: entity first, then rule, then alert, with the attack last. Rows should still read attack, alert, rule, entity — group order beats attach time." \
  "Seeded to prove the summary orders by group before creation time. Not a real proposal."
attach_entity host "ordering-last-attached-first"
attach_rule "Ordering probe — rule attached third from last"
attach_alert "Ordering probe — alert attached second" medium
attach_attack "Ordering probe — attack attached last, must render first"

# ---- summary ----------------------------------------------------------------

echo ""
echo "Done. Open Security → AlertZero: Respond has 6, Investigate 2, Configure 8."
echo "Each proposal has its own conversation, titled after the proposal, and its"
echo "own attachments."
echo ""
echo "If no new cards showed up in the queue, the create_proposal step failed and"
echo "you are missing the patch described at the top of this script. The"
echo "conversations still exist — open them in Agent Builder and use the"
echo "conversation details button to reach the same flyout."
echo ""
echo "Alert rows in the attachment summary are backed by real Elasticsearch"
echo "documents in ${ALERT_INDEX}. Clicking any alert row opens the Security"
echo "alert flyout for that document. If rows stayed read-only, check that ES"
echo "is reachable at ${ES_URL} and that no '! ES indexing failed' warnings"
echo "appeared above."
echo ""
echo "To see the attachment summary, open a card's investigation flyout:"
echo "  • \"[seed] Batch alert rows — 7 clickable\" — the focused drill-down"
echo "    test: five rows visible, two behind Show more, every row clickable."
echo "  • \"Kerberoasting against service accounts\" — 19 real alert rows."
echo "  • \"Impossible travel — exec account (cfo@corp)\" — three single alerts."
echo "  • \"[seed] Attachment summary — 12 rows\" — five rows, \"Show more (7)\"."
echo "  • \"[seed] Attachment summary — exactly 5 rows\" — five rows, no toggle."
echo "  • \"[seed] Attachment summary — excluded types only\" — no section."
echo "  • \"[seed] Attachment summary — ordering\" — attack, alert, rule, entity."
