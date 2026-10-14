/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Multi-alert batch fixtures for the alert-analysis managed-workflow eval.
 *
 * Every single-alert fixture in `synthetic_alerts.ts` seeds ONE alert per workflow run, so the
 * classification step always sees a batch of one. That leaves the workflow's batching contract
 * unexercised end to end: `consts.batch_size` (50) alerts are meant to arrive in ONE `ai.agent`
 * call, the model is asked to return exactly one verdict per alert id, and the workflow pairs
 * verdicts back to alerts by id (`apply_verdicts` → `where: 'id'`). A model that emits extra
 * verdicts, repeats an id, echoes an id from outside the batch, drops one, or attaches a
 * well-formed id to the wrong alert's reasoning is graded as long as one alert is classified.
 *
 * These fixtures make that contract observable, and the `batch_verdicts.ts` predicates grade it:
 *
 *   - `aa-eval-batch-50`            exactly `batch_size` (50) alerts → one batch, fifty verdicts.
 *   - `aa-eval-batch-10`            ten alerts → still one batch, ten verdicts.
 *   - `aa-eval-batch-near-dup`      two alerts that are near-identical apart from id/host/entity
 *                                   (same rule execution, same observable), which tempt the model
 *                                   into a merged or duplicated verdict.
 *   - `aa-eval-batch-id-collision`  three alerts whose ids differ by ONE or TWO hex characters,
 *                                   with DIFFERENT golden labels. A model that corrupts an id by a
 *                                   character swap (`gpt-oss-120b` was measured doing exactly this
 *                                   on ids) lands on a well-formed id that belongs to another real
 *                                   alert in the same batch: the verdict then passes an
 *                                   "ids ⊆ batch ids" check while describing the wrong alert. The
 *                                   different labels make the swap visible in per-alert accuracy
 *                                   as well as in the correspondence check.
 *
 * Construction rules, both required by the workflow under test:
 *   - ONE rule per batch. The workflow anchors every rule-scoped enrichment (prevalence, noise
 *     signal, close history, rule metadata) on `event.alerts[0].kibana.alert.rule.uuid` and
 *     rejects multi-rule caller input, so a batch is one rule execution whose alerts differ only in
 *     host / user / process evidence. That is also what a real alert trigger fires.
 *   - Golden labels are the gate-driven verdicts the single-alert fixtures already encode (Gate A/C
 *     → true_positive for unsigned malicious observables; Gate D → false_positive for the same
 *     technique carried by a signed vendor process), so a batch fixture is a composition of already
 *     labeled archetypes rather than a new labeling claim.
 *
 * `<run>` in an id is replaced per run (see `buildBatchAlerts`) with a short random hex tag, so a
 * repetition never reuses an alert `_id` (the workflow tags analyzed alerts and short-circuits a
 * re-run) while the ids inside a batch keep the character-level relationship the fixture tests.
 */

import type { Classification } from './constants';
import { buildDoc, type LabeledAlert } from './synthetic_alerts';

/** Placeholder in an alert id template that is replaced with the per-run hex tag. */
export const RUN_TAG_PLACEHOLDER = '<run>';

export interface BatchRule {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  tactic: { id: string; name: string };
  technique: { id: string; name: string };
}

/** An alert template inside a batch; its doc is built per run so the id/rule uuid can be fresh. */
export interface BatchAlertSpec {
  /** Alert id template; `<run>` becomes the per-run hex tag. */
  id: string;
  expected: Classification;
  description: string;
  markers: string[];
  observable: Record<string, unknown>;
}

export interface LabeledAlertBatch {
  id: string;
  description: string;
  rule: BatchRule;
  alerts: BatchAlertSpec[];
  /**
   * Alert id pairs (resolved ids) whose ids differ by only one or two hex characters. Declared so
   * the intent of the fixture is auditable and so a unit test can assert the distance.
   */
  nearCollisionPairs: Array<[string, string]>;
}

/** The rule every batch in this file shares the shape of: a behavioral injection rule. */
const INJECTION_RULE: BatchRule = {
  name: 'Malicious Behavior Detection Alert: Suspicious Process Injection',
  description:
    'Elastic Defend behavioral engine detected a process writing into another process’ memory, consistent with process injection.',
  severity: 'high',
  riskScore: 73,
  tactic: { id: 'TA0004', name: 'Privilege Escalation' },
  technique: { id: 'T1055', name: 'Process Injection' },
};

const WMIC_RULE: BatchRule = {
  name: 'Malicious Behavior Detection Alert: Suspicious WMI Execution',
  description:
    'Elastic Defend behavioral engine detected WMI process execution, which can be used for remote execution.',
  severity: 'medium',
  riskScore: 47,
  tactic: { id: 'TA0002', name: 'Execution' },
  technique: { id: 'T1047', name: 'Windows Management Instrumentation' },
};

const HOST_PREFIXES = ['ws-fin', 'ws-dev', 'ws-eng', 'ws-hr', 'srv-app', 'srv-db'];
const USERS = ['jsmith', 'mchen', 'tluna', 'apatel', 'kobrien', 'rsilva', 'dwong', 'hkim'];

const pad2 = (n: number): string => String(n).padStart(2, '0');

const hostFor = (n: number): string => `${HOST_PREFIXES[n % HOST_PREFIXES.length]}-${pad2(n)}`;

const userFor = (n: number): string => `${USERS[n % USERS.length]}${pad2(n)}`;

/**
 * Gate A/C archetype (true_positive): the same behavioral injection detection but the process is
 * unsigned, lives outside any vendor directory, and was launched by an Office document — the
 * malicious-observable evidence the single-alert Tier 2 fixtures encode. The executable name is
 * randomized per alert (as masquerading binaries are) so the model has a per-alert token it can
 * name in its rationale.
 */
const unsignedInjectorObservable = (
  n: number
): { observable: Record<string, unknown>; markers: string[] } => {
  const host = hostFor(n);
  const user = userFor(n);
  const binary = `${pad2(n)}f3c1.exe`;
  const executable = `C:\\Users\\${user}\\AppData\\Roaming\\${binary}`;
  return {
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': host,
      'user.name': user,
      'process.name': binary,
      'process.executable': executable,
      'process.command_line': `${binary} --inject 4321`,
      'process.code_signature.exists': false,
      'process.code_signature.trusted': false,
      'process.parent.name': 'winword.exe',
      'process.parent.executable':
        'C:\\Program Files\\Microsoft Office\\root\\Office16\\winword.exe',
    },
    markers: [host, user, binary],
  };
};

/**
 * Gate D archetype (false_positive): the same injection signal, but carried by a Microsoft-signed
 * Defender process doing a routine scan. High-precision technique + signed vendor process is the
 * legitimate-use case the Tier 3 fixtures label false_positive. The scanned file is per-alert so
 * each alert keeps a token of its own.
 */
const signedVendorObservable = (
  n: number
): { observable: Record<string, unknown>; markers: string[] } => {
  const host = hostFor(n);
  const user = userFor(n);
  const scanned = `report-${pad2(n)}.zip`;
  return {
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': host,
      'user.name': user,
      'process.name': 'MsMpEng.exe',
      'process.executable':
        'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.24050.7-0\\MsMpEng.exe',
      'process.command_line': `MpCmdRun.exe -Scan -ScanType 3 -File C:\\Users\\${user}\\Downloads\\${scanned}`,
      'process.code_signature.exists': true,
      'process.code_signature.trusted': true,
      'process.code_signature.subject_name': 'Microsoft Corporation',
      'process.parent.name': 'MsSense.exe',
      'process.parent.executable':
        'C:\\Program Files\\Windows Defender Advanced Threat Protection\\MsSense.exe',
    },
    markers: [host, user, scanned],
  };
};

/** Same two archetypes behind the WMI rule, for the ten-alert batch. */
const unsignedWmiObservable = (
  n: number
): { observable: Record<string, unknown>; markers: string[] } => {
  const host = hostFor(n);
  const user = userFor(n);
  const script = `${pad2(n)}7ab.js`;
  return {
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': host,
      'user.name': user,
      'process.name': 'wmic.exe',
      'process.executable': `C:\\Users\\${user}\\AppData\\Local\\Temp\\${script}`,
      'process.command_line': `wmic process call create "powershell -enc ${pad2(n)}AB12`,
      'process.code_signature.exists': false,
      'process.code_signature.trusted': false,
      'process.parent.name': 'excel.exe',
      'process.parent.executable': 'C:\\Program Files\\Microsoft Office\\root\\Office16\\excel.exe',
    },
    markers: [host, user, script],
  };
};

const signedWmiObservable = (
  n: number
): { observable: Record<string, unknown>; markers: string[] } => {
  const host = hostFor(n);
  const user = userFor(n);
  const query = `win32_${pad2(n)}`;
  return {
    observable: {
      'event.kind': 'signal',
      'event.category': ['process'],
      'event.type': ['start'],
      'event.code': 'behavior',
      'event.outcome': 'success',
      'host.name': host,
      'user.name': user,
      'process.name': 'WmiPrvSE.exe',
      'process.executable': 'C:\\Windows\\System32\\wbem\\WmiPrvSE.exe',
      'process.command_line': `wmic /namespace:\\\\root\\cimv2 path ${query} get caption`,
      'process.code_signature.exists': true,
      'process.code_signature.trusted': true,
      'process.code_signature.subject_name': 'Microsoft Windows',
      'process.parent.name': 'sccm-inventory.exe',
      'process.parent.code_signature.trusted': true,
      'process.parent.code_signature.subject_name': 'Microsoft Corporation',
    },
    markers: [host, user, query],
  };
};

/** The fifty-alert batch: exactly `consts.batch_size` alerts, one rule execution, one model call. */
const buildFifty = (): BatchAlertSpec[] =>
  Array.from({ length: 50 }, (_, i) => {
    const isTruePositive = i % 2 === 0;
    const { observable, markers } = isTruePositive
      ? unsignedInjectorObservable(i + 1)
      : signedVendorObservable(i + 1);
    return {
      id: `aa-eval-batch50-${RUN_TAG_PLACEHOLDER}-${pad2(i + 1)}`,
      expected: isTruePositive ? 'true_positive' : 'false_positive',
      description: `Batch-size (50) alert ${i + 1}/50 — ${
        isTruePositive
          ? 'unsigned injector launched from an Office document (Gate C) → true_positive'
          : 'Microsoft-signed Defender scan using the same technique (Gate D) → false_positive'
      }.`,
      markers,
      observable,
    };
  });

const buildTen = (): BatchAlertSpec[] =>
  Array.from({ length: 10 }, (_, i) => {
    const isTruePositive = i % 2 === 0;
    const { observable, markers } = isTruePositive
      ? unsignedWmiObservable(i + 1)
      : signedWmiObservable(i + 1);
    return {
      id: `aa-eval-batch10-${RUN_TAG_PLACEHOLDER}-${pad2(i + 1)}`,
      expected: isTruePositive ? 'true_positive' : 'false_positive',
      description: `Ten-alert batch ${i + 1}/10 — ${
        isTruePositive
          ? 'unsigned script dropped in Temp invoked through wmic from Excel (Gate C) → true_positive'
          : 'Microsoft-signed SCCM inventory WMI query (Gate D) → false_positive'
      }.`,
      markers,
      observable,
    };
  });

/**
 * Near-duplicate pair: same rule, same observable, same parent, same timestamp — only the alert id,
 * host, user and entity ids differ. The pair tempts a single merged verdict (one alert then gets no
 * verdict → coverage fails) or a duplicated verdict under one id (duplicate id → integrity fails).
 * The two other alerts keep the batch honest.
 */
const buildNearDuplicate = (): BatchAlertSpec[] => {
  const first = unsignedInjectorObservable(11);
  const second = unsignedInjectorObservable(12);
  return [
    {
      id: `aa-eval-batch-dup-${RUN_TAG_PLACEHOLDER}-a1`,
      expected: 'true_positive',
      description:
        'Near-duplicate pair member 1 — unsigned injector launched from an Office document (Gate C) → true_positive.',
      markers: first.markers,
      observable: first.observable,
    },
    {
      id: `aa-eval-batch-dup-${RUN_TAG_PLACEHOLDER}-a2`,
      expected: 'true_positive',
      description:
        'Near-duplicate pair member 2 — the same observable on another host; must still get its OWN verdict → true_positive.',
      markers: second.markers,
      observable: second.observable,
    },
    {
      id: `aa-eval-batch-dup-${RUN_TAG_PLACEHOLDER}-a3`,
      expected: 'false_positive',
      description:
        'Same batch, signed Defender scan (Gate D) → false_positive; must not inherit the pair’s verdict.',
      markers: signedVendorObservable(13).markers,
      observable: signedVendorObservable(13).observable,
    },
    {
      id: `aa-eval-batch-dup-${RUN_TAG_PLACEHOLDER}-a4`,
      expected: 'false_positive',
      description: 'Same batch, second signed Defender scan (Gate D) → false_positive.',
      markers: signedVendorObservable(14).markers,
      observable: signedVendorObservable(14).observable,
    },
  ];
};

/**
 * Id-collision batch: three alerts whose ids differ by one or two hex characters (…c2, …c3, …df)
 * and whose golden labels differ, so a single-character id corruption that lands on another real
 * alert in the batch shows up as a per-alert accuracy drop AND as a correspondence mismatch
 * (the verdict's evidence names a different host than the id it carries).
 */
const buildIdCollision = (): BatchAlertSpec[] => [
  {
    id: `aa-eval-tier2-inject-${RUN_TAG_PLACEHOLDER}-7f3a91c2`,
    expected: 'true_positive',
    description:
      'Collision triple member 1 (id …c2) — unsigned injector from an Office document (Gate C) → true_positive.',
    ...unsignedInjectorObservable(21),
  },
  {
    id: `aa-eval-tier2-inject-${RUN_TAG_PLACEHOLDER}-7f3a91c3`,
    expected: 'false_positive',
    description:
      'Collision triple member 2 (id …c3, one hex character from …c2) — signed Defender scan (Gate D) → false_positive.',
    ...signedVendorObservable(22),
  },
  {
    id: `aa-eval-tier2-inject-${RUN_TAG_PLACEHOLDER}-7f3a91df`,
    expected: 'true_positive',
    description:
      'Collision triple member 3 (id …df, two hex characters from …c2) — unsigned injector from a spreadsheet (Gate C) → true_positive.',
    ...unsignedInjectorObservable(23),
  },
];

export const ALERT_ANALYSIS_EVAL_BATCHES: LabeledAlertBatch[] = [
  {
    id: 'aa-eval-batch-50',
    description:
      'Fifty alerts (exactly the workflow’s batch_size) of one rule execution, classified in one model call: one verdict per alert id, no extras, no repeats, no foreign ids.',
    rule: INJECTION_RULE,
    alerts: buildFifty(),
    nearCollisionPairs: [],
  },
  {
    id: 'aa-eval-batch-10',
    description:
      'Ten alerts of one rule execution: the same batch contract at a smaller size, so a failure is attributable to the batch rather than to the prompt length.',
    rule: WMIC_RULE,
    alerts: buildTen(),
    nearCollisionPairs: [],
  },
  {
    id: 'aa-eval-batch-near-dup',
    description:
      'Four alerts, two of them near-identical (same rule and observable, different id/host): a merged verdict leaves one alert unanalyzed and a duplicated verdict repeats an id.',
    rule: INJECTION_RULE,
    alerts: buildNearDuplicate(),
    nearCollisionPairs: [],
  },
  {
    id: 'aa-eval-batch-id-collision',
    description:
      'Three alerts whose ids differ by one or two hex characters and whose golden labels differ, so a single-character id corruption that lands on another alert in the batch is observable.',
    rule: INJECTION_RULE,
    alerts: buildIdCollision(),
    nearCollisionPairs: [
      [
        `aa-eval-tier2-inject-${RUN_TAG_PLACEHOLDER}-7f3a91c2`,
        `aa-eval-tier2-inject-${RUN_TAG_PLACEHOLDER}-7f3a91c3`,
      ],
      [
        `aa-eval-tier2-inject-${RUN_TAG_PLACEHOLDER}-7f3a91c2`,
        `aa-eval-tier2-inject-${RUN_TAG_PLACEHOLDER}-7f3a91df`,
      ],
    ],
  },
];

export const resolveBatchAlertId = (idTemplate: string, runTag: string): string =>
  idTemplate.replaceAll(RUN_TAG_PLACEHOLDER, runTag);

/**
 * Resolves one batch into freshly identified alerts whose documents all carry the SAME rule uuid
 * (one rule execution) and per-alert unique `_id`s, hosts and entity ids. `runTag` must be a short
 * random hex tag per run so concurrent repetitions never share an alert id or rule uuid — the
 * workflow skips alerts already tagged as analyzed and scopes every rule enrichment query by rule
 * uuid.
 */
export const buildBatchAlerts = (batch: LabeledAlertBatch, runTag: string): LabeledAlert[] => {
  const ruleUuid = `${batch.id}-rule-${runTag}`;
  return batch.alerts.map((spec, index) => {
    const id = resolveBatchAlertId(spec.id, runTag);
    return {
      id,
      expected: spec.expected,
      description: spec.description,
      markers: [...spec.markers],
      doc: {
        ...buildDoc({
          id,
          index,
          ruleUuid,
          ruleName: batch.rule.name,
          ruleDescription: batch.rule.description,
          severity: batch.rule.severity,
          riskScore: batch.rule.riskScore,
          tactic: batch.rule.tactic,
          technique: batch.rule.technique,
          observable: {
            ...spec.observable,
            // Per-run unique ids shared by construction with the id, so a repetition of this
            // example cannot correlate with the previous one's entities.
            'process.entity_id': `entity-${id}`,
            'host.id': `host-${id}`,
          },
        }),
      },
    };
  });
};
