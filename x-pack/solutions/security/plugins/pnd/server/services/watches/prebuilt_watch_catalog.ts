/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC (watch-settings-e2e-mvp): shipped pre-built watch catalogue.
 * Experimental — not production. Versions bump here to simulate Elastic shipping an update.
 */

export const PREBUILT_WATCH_IDS = [
  'security-watch-floor',
  'security-watch-officer',
  'security-watch-dark',
  'security-watch-deep',
] as const;

export type PrebuiltWatchId = (typeof PREBUILT_WATCH_IDS)[number];

export interface PrebuiltWatchCatalogEntry {
  id: PrebuiltWatchId;
  /** Bump to simulate Elastic shipping an improved definition. */
  version: number;
  buildYaml: (version: number) => string;
}

const provenanceBlock = (id: PrebuiltWatchId, version: number): string => `  watch_provenance:
    originSeedId: ${id}
    seedContentVersion: ${version}
    # POC: customer-editable document — provenance is best-effort, not a sealed stamp
`;

const floorYaml = (version: number): string => `version: "1"
name: Watch Floor
description: >
  Tier-1 Security Watch Floor. Triages alerts via the alert-analysis skill.
  ${version > 1 ? 'POC ship v' + version + ': improved triage prompt.' : 'Full Alert Analysis managed-workflow wrap is the next Floor spike.'}
enabled: true
tags:
  - watch
  - watch-floor
triggers:
  - type: alert
  - type: manual
consts:
${provenanceBlock('security-watch-floor', version)}  watch_policy:
    mandate: Frontline triage
    autonomyLevel: 3
    handoff: officer
    onDemand: false
    draft: false
    cadence: stream
    mode: always
    ui:
      color: "#16b3a6"
      icon: alert
      order: 10
    scopeSummary: Security indices · APM · logs
    scopes:
      - name: Security indices
        access: full
        label: Read
      - name: APM · logs · SLOs
        access: full
        label: Read
      - name: Finance PII
        access: masked
        label: Masked
    callables:
      - id: alert-analysis
        name: Alert analysis
        kind: skill
        summary: On alert · classifies FP / TP / inconclusive
        gated: false
        enabled: true
steps:
  - name: triage_alerts
    type: ai.agent
    timeout: "10m"
    create-conversation: true
    with:
      message: >
        Use the [/alert-analysis](skill://alert-analysis) skill to triage the
        security alert context below.${
          version > 1
            ? ' Prefer precision over recall when evidence is thin. POC_SHIP_MARKER_V' +
              version +
              '.'
            : ' Prefer recall over precision when unsure.'
        }
        Return a structured classification.

        Alert / event context:
        {{ event | json }}
      schema:
        type: object
        properties:
          classification:
            type: string
            enum:
              - false_positive
              - true_positive
              - inconclusive
          confidence_score:
            type: number
            minimum: 0
            maximum: 1
          rationale:
            type: string
        required:
          - classification
          - confidence_score
          - rationale
  - name: record_reasoning
    type: data.set
    with:
      reasoning:
        summary: >-
          {{ steps.triage_alerts.output.structured_output.rationale
          | default: "Watch Floor triage completed." }}
        sections:
          - title: Classification
            body: >-
              {{ steps.triage_alerts.output.structured_output.classification
              | default: "inconclusive" }}
`;

const officerYaml = (version: number): string => `version: "1"
name: Watch Officer
description: >
  Tier-2 Security Watch Officer. Escalates criticals, drafts briefs,
  and stages gated response proposals.${
    version > 1 ? ' POC ship v' + version + ': adds a scheduled sweep.' : ''
  }
enabled: true
tags:
  - watch
  - watch-officer
triggers:
  - type: scheduled
    with:
      every: "1h"
  - type: manual
consts:
${provenanceBlock('security-watch-officer', version)}  watch_policy:
    mandate: Escalation & briefs
    autonomyLevel: 4
    handoff: oncall
    onDemand: false
    draft: false
    cadence: sweep
    every: 60
    mode: always
    ui:
      color: "#3b82f6"
      icon: bell
      order: 20
    scopeSummary: Open threads · on-call · deploys
    scopes:
      - name: Open threads · cases
        access: full
        label: Read
      - name: On-call schedule
        access: full
        label: Read
      - name: Deploy history
        access: full
        label: Read
    callables: []
steps:
  - name: draft_proposal
    type: data.set
    with:
      reasoning:
        summary: "Watch Officer${
          version > 1 ? ' v' + version : ''
        } — staged a gated proposal for review."
        sections:
          - title: NEXT
            body: "Replace with investigation / proposal skills and real evidence."
  - name: await_approval
    type: waitForInput
    with:
      message: "Approve the Watch Officer draft proposal?"
      schema:
        type: object
        properties:
          decision:
            type: string
            enum: [approve, modify, dismiss]
        required: [decision]
`;

const darkYaml = (version: number): string => `version: "1"
name: Dark Watch
description: >
  Dark Watch. Continuous, technology-aware hunting with scheduled sweeps
  and reviewable findings.${version > 1 ? ' POC ship v' + version + ': tighter hunt stub.' : ''}
enabled: true
tags:
  - watch
  - watch-dark
triggers:
  - type: scheduled
    with:
      every: "1h"
  - type: manual
consts:
${provenanceBlock('security-watch-dark', version)}  watch_policy:
    mandate: Continuous, technology-aware hunting for relevant threats and coverage gaps
    autonomyLevel: 2
    handoff: brief
    onDemand: true
    draft: false
    cadence: sweep
    every: 60
    from: 22
    to: 6
    mode: window
    ui:
      color: "#f59e0b"
      icon: bolt
      order: 30
    scopeSummary: Mail · IdP · edge / VPN
    scopes:
      - name: Mail · IdP
        access: full
        label: Read + monitor
      - name: Edge / VPN
        access: full
        label: Read + monitor
      - name: Customer data
        access: denied
        label: No access
    callables: []
steps:
  - name: hunt_stub
    type: console
    with:
      message: "Dark Watch${
        version > 1 ? ' v' + version + ' POC_SHIP_MARKER' : ''
      } skeleton — add ai.agent / skill steps (see Floor)"
`;

const deepYaml = (version: number): string => `version: "1"
name: Deep Watch
description: >
  Deep Watch. Specialist, on-demand depth — forensics,
  hunts, and draft-only conclusions under human review.${
    version > 1 ? ' POC ship v' + version + '.' : ''
  }
enabled: true
tags:
  - watch
  - watch-deep
triggers:
  - type: manual
consts:
${provenanceBlock('security-watch-deep', version)}  watch_policy:
    mandate: Deep investigation & hunts
    autonomyLevel: 3
    handoff: records
    onDemand: true
    draft: false
    cadence: manual
    from: 8
    to: 18
    mode: window
    ui:
      color: "#8b5cf6"
      icon: console
      order: 40
    scopeSummary: Security indices · EDR · DNS
    scopes:
      - name: Security indices
        access: full
        label: Read
      - name: EDR telemetry
        access: full
        label: Read
      - name: DNS · netflow
        access: full
        label: Read
    callables: []
steps:
  - name: specialist_stub
    type: console
    with:
      message: "Deep Watch${
        version > 1 ? ' v' + version : ''
      } skeleton — add ai.agent / skill steps (see Floor)"
`;

/**
 * Shipped catalogue versions. Bump a single entry to simulate Elastic shipping
 * an update; restart Kibana (or hot-reload) then take the update from the UI.
 */
export const PREBUILT_WATCH_CATALOG: Record<PrebuiltWatchId, PrebuiltWatchCatalogEntry> = {
  'security-watch-floor': {
    id: 'security-watch-floor',
    // Bumped for ship-an-update / conflict probes (seeded at 1; settings-survive at 2).
    version: 3,
    buildYaml: floorYaml,
  },
  'security-watch-officer': {
    id: 'security-watch-officer',
    version: 1,
    buildYaml: officerYaml,
  },
  'security-watch-dark': {
    id: 'security-watch-dark',
    version: 1,
    buildYaml: darkYaml,
  },
  'security-watch-deep': {
    id: 'security-watch-deep',
    version: 1,
    buildYaml: deepYaml,
  },
};

export const isPrebuiltWatchId = (id: string): id is PrebuiltWatchId =>
  (PREBUILT_WATCH_IDS as readonly string[]).includes(id);

export const getCatalogYaml = (id: PrebuiltWatchId, version?: number): string => {
  const entry = PREBUILT_WATCH_CATALOG[id];
  return entry.buildYaml(version ?? entry.version);
};
