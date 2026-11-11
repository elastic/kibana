/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Workflows behind the `create.case` and `create.channel` workflow tools of the
 * parity profile. They mirror the external EIS model benchmark's workflows, with
 * two deliberate changes:
 *  - `create-channel` writes the channel request to SIDE_EFFECTS_INDEX instead of
 *    calling Slack, so a run is hermetic and the request can still be scored.
 *  - The on-call default is the seeded synthetic responder, not a real person.
 */

export const SIDE_EFFECTS_INDEX = 'persona-matrix-side-effects';

/**
 * Tag on every case `create-case` opens; cleanup finds this run's cases by it.
 * Deliberately not `chrysalis`: the external benchmark's own create-case workflow
 * uses that tag, and cleanup must never match its cases.
 */
export const PARITY_CASE_TAG = 'persona-matrix-parity';

export const PARITY_ON_CALL_EMAIL = 'priya.kapoor@example.corp';

export const CREATE_CASE_WORKFLOW_ID = 'create-case';
export const CREATE_CHANNEL_WORKFLOW_ID = 'create-channel';
export const VT_HASH_LOOKUP_WORKFLOW_ID = 'vt-hash-lookup';
export const WRITE_TODOS_WORKFLOW_ID = 'write-todos';

const CREATE_CASE_WORKFLOW_YAML = `name: create-case
description: Create a case in Elastic Security from a confirmed attack discovery.
enabled: true
tags:
  - security
  - incident-response
  - cases
inputs:
  - name: title
    type: string
    required: true
    description: Short title for the case.
  - name: description
    type: string
    required: true
    description: Markdown body summarizing the attack, evidence, IOCs, VirusTotal verdict, and recommended actions.
  - name: severity
    type: string
    required: false
    default: "high"
    description: Case severity - one of low, medium, high, critical.
triggers:
  - type: manual
steps:
  - name: create_security_case
    type: kibana.request
    with:
      method: "POST"
      path: "/api/cases"
      body:
        title: "{{ inputs.title }}"
        description: "{{ inputs.description }}"
        tags: ["${PARITY_CASE_TAG}", "attack-discovery", "agent-builder"]
        severity: "{{ inputs.severity }}"
        owner: "securitySolution"
        assignees: []
        connector:
          id: "none"
          name: "none"
          type: ".none"
          fields: null
        settings:
          syncAlerts: false
    on-failure:
      retry:
        max-attempts: 2
`;

const CREATE_CHANNEL_WORKFLOW_YAML = `name: create-channel
description: Record a request for a unique incident channel, the on-call responder to invite, and the incident message to post. A unique suffix is appended to the channel name so re-runs never collide.
enabled: true
tags:
  - security
  - incident-response
  - slack
inputs:
  - name: channel_name
    type: string
    required: true
    description: Base channel name (lowercase, hyphenated, no spaces, e.g. incident-chrysalis-srv-win-defend-01). A unique suffix is appended automatically, so the same base name can be reused across incidents without collisions.
  - name: message
    type: string
    required: true
    description: The formatted incident message to post in the new channel (markdown supported).
  - name: oncall_email
    type: string
    required: false
    default: "${PARITY_ON_CALL_EMAIL}"
    description: Email of the on-call responder to invite to the channel.
triggers:
  - type: manual
steps:
  - name: record_channel
    type: elasticsearch.index
    with:
      index: ${SIDE_EFFECTS_INDEX}
      id: "{{ execution.id }}"
      refresh: wait_for
      document:
        "@timestamp": "{{ execution.startedAt }}"
        side_effect: create.channel
        channel: "{{ inputs.channel_name }}-{{ execution.id | slice: 0, 8 }}"
        invitees: ["{{ inputs.oncall_email }}"]
        message: "{{ inputs.message }}"
        execution_id: "{{ execution.id }}"
`;

export interface ParityWorkflow {
  id: string;
  yaml: string;
}

/** Index receiving every `write_todos` call, so planning behaviour stays inspectable. */
export const TODOS_INDEX = 'persona-matrix-todos';

/**
 * The external benchmark's agent had the platform's builtin `write_todos` tool;
 * the platform removed it platform-wide (#303186) after that baseline was
 * captured. This workflow reconstructs the tool's contract: a required
 * `todos` array of `{content, status}` objects (JSON-Schema trigger inputs,
 * the only format carrying arrays of objects), a verbatim copy of the original
 * tool description (model tool-selection keys on it), and an ack-only result.
 * Writes land in TODOS_INDEX so planning divergence stays diagnosable without
 * affecting any evaluator (planning is not a side effect, see
 * `SIDE_EFFECT_TOOL_IDS`).
 */
const WRITE_TODOS_WORKFLOW_YAML = `name: write-todos
description: Record the agent's updated task list (planning bookkeeping only).
enabled: true
tags:
  - persona-matrix
  - planning
inputs:
  type: object
  properties:
    todos:
      type: array
      description: Complete updated todo list. Always pass the full list — previous items are replaced.
      items:
        type: object
        properties:
          content:
            type: string
            description: The task description
          status:
            type: string
            enum: [pending, in_progress, completed, cancelled]
            description: Current status of the task
        required: [content, status]
  required: [todos]
triggers:
  - type: manual
steps:
  - name: record_todos
    type: elasticsearch.index
    with:
      index: ${TODOS_INDEX}
      id: "{{ execution.id }}"
      refresh: wait_for
      document:
        "@timestamp": "{{ execution.startedAt }}"
        todos: "{{ inputs.todos | json }}"
        execution_id: "{{ execution.id }}"
`;

const VT_HASH_LOOKUP_WORKFLOW_YAML = `name: vt-hash-lookup
description: Analyze a file hash (MD5, SHA-1, or SHA-256) against the seeded threat-intel corpus and return the detection verdict, names, and confidence. Used by the Chrysalis Hunting Agent to confirm whether a hash observed in the environment is known malware.
enabled: true
tags:
  - security
  - threat-intel
  - virustotal
inputs:
  - name: hash
    type: string
    required: true
    description: The file hash to look up (MD5, SHA-1, or SHA-256).
triggers:
  - type: manual
steps:
  - name: vt_lookup
    type: elasticsearch.esql.query
    with:
      query: >-
        FROM logs-ti_chrysalis_sim-default | WHERE threat.indicator.file.hash.sha256 == ?1 | KEEP threat.indicator.file.hash.sha256, threat.indicator.file.name, threat.indicator.description, threat.indicator.confidence | LIMIT 10
      params:
        - "{{ inputs.hash }}"
      format: json
`;

/**
 * Create order matters: workflow tools validate that their workflow exists.
 * `vt-hash-lookup` reads the seeded TI index instead of calling VirusTotal (no
 * API key, hermetic), keeping the tool contract identical.
 */
export const PARITY_WORKFLOWS: readonly ParityWorkflow[] = [
  { id: VT_HASH_LOOKUP_WORKFLOW_ID, yaml: VT_HASH_LOOKUP_WORKFLOW_YAML },
  { id: CREATE_CASE_WORKFLOW_ID, yaml: CREATE_CASE_WORKFLOW_YAML },
  { id: CREATE_CHANNEL_WORKFLOW_ID, yaml: CREATE_CHANNEL_WORKFLOW_YAML },
  { id: WRITE_TODOS_WORKFLOW_ID, yaml: WRITE_TODOS_WORKFLOW_YAML },
];
