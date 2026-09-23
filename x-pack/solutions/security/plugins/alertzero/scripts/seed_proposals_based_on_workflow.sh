#!/usr/bin/env bash
set -euo pipefail

# Fills the AlertZero home queue with the eleven open proposals from the design
# prototype — five Respond, two Investigate, four Configure. Closed rows are not
# seeded: they need a decision, which this script does not make.
#
# Two steps:
#   1. Installs the "Create proposed action" test-helper workflow (idempotent:
#      it is created under a fixed id, and updated in place on a re-run).
#   2. Fires that workflow once per proposal. Each run creates its own
#      conversation, so every proposal lands on its own card in the queue.
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
#   - The workflows and workflows_execution_engine plugins enabled
#   - curl and jq on PATH
#
# Usage:
#   bash x-pack/solutions/security/plugins/alertzero/scripts/seed_proposals_based_on_workflow.sh \
#     [--url http://localhost:5601/kbn] [--user elastic] [--password changeme] [--space default]

KIBANA_URL="${KIBANA_URL:-http://localhost:5601/kbn}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
KIBANA_SPACE="${KIBANA_SPACE:-default}"

WORKFLOWS_API_VERSION="2023-10-31"
WORKFLOW_ID="alertzero-seed-create-proposed-action"

usage() {
  cat <<'USAGE'
Seeds the AlertZero queue with the prototype's open proposals.

Options:
  --url URL           Kibana base URL, base path included (default: http://localhost:5601/kbn)
  --user USER         Kibana user (default: elastic)
  --password PASS     Kibana password (default: changeme)
  --space SPACE       Kibana space (default: default)
  -h, --help          Show this help

Each option also reads from its environment variable: KIBANA_URL, KIBANA_USER,
KIBANA_PASSWORD, KIBANA_SPACE. The flag wins.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --url) KIBANA_URL="$2"; shift 2 ;;
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

# Strip a trailing slash, so the URLs below never double up on it.
KIBANA_URL="${KIBANA_URL%/}"

if [ "$KIBANA_SPACE" = "default" ]; then
  KIBANA_API_BASE="${KIBANA_URL}"
else
  KIBANA_API_BASE="${KIBANA_URL}/s/${KIBANA_SPACE}"
fi

kibana_curl() {
  curl --silent --fail-with-body \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${WORKFLOWS_API_VERSION}" \
    "$@"
}

# ---- 1. install the helper workflow ----------------------------------------

# Explicit template: GNU mktemp rejects `-t` without one.
WORKFLOW_YAML_FILE="$(mktemp "${TMPDIR:-/tmp}/alertzero-seed-workflow.XXXXXX")"
trap 'rm -f "$WORKFLOW_YAML_FILE"' EXIT

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
fire() {
  local category="$1" title="$2" comment="$3" execution_id
  execution_id=$(
    kibana_curl -X POST \
      "${KIBANA_API_BASE}/api/workflows/workflow/${WORKFLOW_ID}/run" \
      -d "$(jq -n \
        --arg title "$title" \
        --arg comment "$comment" \
        --arg category "$category" \
        '{ inputs: { conversationTitle: $title, comment: $comment, category: $category } }')" \
      | jq -r '.workflowExecutionId'
  )
  echo "  [${category}] ${title} → ${execution_id}"
}

echo ""
echo "Creating 11 open proposals…"

fire respond \
  "Impossible travel — exec account (cfo@corp)" \
  "MFA was satisfied from two countries in 40 minutes — a replayed session cookie. Elastic Defend on the CFO's laptop shows an unsigned launch agent reading the bro…"

fire respond \
  "Kerberoasting against service accounts — fin-dc-01" \
  "19 SPN ticket requests for svc-helpdesk and svc-backup in four minutes from fin-ws-31, all downgraded to RC4 — offline cracking is the point."

fire respond \
  "Suspicious OAuth consent — hr-admin" \
  "hr-admin granted finance-sync Mail.ReadWrite and offline_access on the payroll mailbox — no ticket, publisher verified this morning."

fire respond \
  "Backup retention rewritten — svc-backup" \
  "Finance backup retention cut 35 days → 1 by svc-backup, no change ticket. Two restore points already aged out."

fire respond \
  "Data staging detected — FIN-DB-02" \
  'A 4.2 GB archive was assembled in C:\temp on FIN-DB-02 from finance exports. Nothing has left the host yet — staged, not exfiltrated.'

fire investigate \
  "KRBTGT password age — fin-dc-01" \
  "KRBTGT last rotated 412 days ago — a forged ticket from tonight would still validate. Worth proving before it matters."

fire investigate \
  "Suspicious OAuth consent grant" \
  "Consent is already revoked. The open question is the installer the app pushed to jdoe's workstation — retrieve it from jdoe-ws-17 for analysis before anything else runs."

fire configure \
  "Suspicious OAuth consent — hr-admin" \
  "Require admin consent for Graph mail scopes so an hr-admin grant cannot recur."

fire configure \
  'Noisy rule — "After-hours service-account logon"' \
  "Fires every night on svc-backup's 01:30 backup window — 640 alerts in 30 days, zero true positives. An Elastic Defend event filter on the backup agent's child proces…"

fire configure \
  'Noisy rule — "Backup agent mass file read"' \
  "61% of this week's volume, zero confirmed true positives in 30 days. A Defend trusted application for the signed backup agent clears it."

fire configure \
  'Noisy rule — "Unusual port for process"' \
  'The "Unusual port for process" rule fired 1,240× in 24h — every hit traces to the authorized Qualys scanner sweeping the DMZ. Zero analyst-confirmed true positives i…'

echo ""
echo "Done. Open Security → AlertZero: Respond has 5, Investigate 2, Configure 4."
echo "Each proposal has its own conversation, titled after the proposal."
