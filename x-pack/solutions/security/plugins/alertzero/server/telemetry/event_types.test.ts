/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';
import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ALERT_TRIAGE_CLOSURE_OUTCOMES,
  DETECTION_RULE_SOURCES,
  DETECTION_RULE_TYPES,
  ENDPOINT_ANALYSIS_OUTCOMES,
  HUNT_REPORT_HUNT_STATUSES,
  HUNT_REPORT_MINT_SUPPRESSIONS,
  HUNT_REPORT_PACKAGE_STATUSES,
  INVESTIGATION_CLOSE_REASONS,
  RULE_COVERAGE_PROPOSAL_KINDS,
  RULE_COVERAGE_VERDICTS,
  RULE_TUNING_CHANGE_TYPES,
  RULE_REVIEW_ENTRY_GATES,
  WORKER_DEGRADED_REASONS,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
  WORKER_RUN_OUTCOMES,
} from '../../common/telemetry/constants';
import { ALERTZERO_TELEMETRY_EVENTS, ALERTZERO_TELEMETRY_PREFIX } from './constants';
import type { AlertZeroEnvelope, AlertZeroTelemetryEventPayloads } from './event_types';
import {
  ALERTZERO_AD_WORKER_RUN_COMPLETED_EVENT,
  ALERTZERO_TELEMETRY_EVENT_TYPES,
  ALERTZERO_WORKER_INVESTIGATION_CLOSED_EVENT,
} from './event_types';
import { registerAlertZeroTelemetryEvents } from './register_telemetry_events';

/** Identity and free-text field names no AlertZero event may declare, at any nesting depth. */
const DENYLISTED_FIELD_NAMES = [
  'actionInput',
  'comment',
  'decidedBy',
  'description',
  'email',
  'executionError',
  'message',
  'name',
  'rationale',
  'spaceId',
  'space_id',
  'title',
  'user',
  'username',
];

/** Imports that would couple telemetry to request identity or audit data. */
const FORBIDDEN_IMPORTS = ['KibanaRequest', 'ProposalUser'];

interface SchemaField {
  path: string;
  node: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/** Every declared field, including object properties and array items, with its dotted path. */
const collectFields = (properties: Record<string, unknown>, prefix = ''): SchemaField[] =>
  Object.entries(properties).flatMap(([key, node]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!isRecord(node)) {
      return [{ node: {}, path }];
    }
    const items = isRecord(node.items) ? node.items : undefined;
    const nestedProperties = isRecord(node.properties)
      ? node.properties
      : isRecord(items?.properties)
      ? items?.properties
      : undefined;
    const nested = isRecord(nestedProperties) ? collectFields(nestedProperties, path) : [];
    return [{ node, path }, ...nested];
  });

const getDescription = (node: Record<string, unknown>): unknown =>
  isRecord(node._meta) ? node._meta.description : undefined;

const getLeafName = (path: string): string => path.split('.').pop() ?? path;

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return /\.tsx?$/.test(entry) ? [fullPath] : [];
  });

/** Names bound or re-exported by every import/export declaration in a source file. */
const collectImportedNames = (filePath: string): string[] => {
  const source = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  return source.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement)) {
      const bindings = statement.importClause?.namedBindings;
      const named =
        bindings && ts.isNamedImports(bindings)
          ? bindings.elements.map((element) => (element.propertyName ?? element.name).text)
          : [];
      const defaultName = statement.importClause?.name?.text;
      return defaultName ? [defaultName, ...named] : named;
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      return statement.exportClause.elements.map(
        (element) => (element.propertyName ?? element.name).text
      );
    }
    return [];
  });
};

const envelope: AlertZeroEnvelope = {
  autonomy_level: 'supervised',
  autonomy_mode: 'auto_accept',
  execution_id: 'c5d0e2a9-3b7e-4c61-8f2d-6a9b0e4d7f21',
  is_default_space: true,
  run_id: '0b6a1f4e-8c43-4a39-9a4e-1f7f5f3f9c10',
  trigger_type: 'scheduled',
  watch_tag: 'watch-floor',
  worker_id: 'system-security-floor-attack-discovery',
};

/** One valid payload per event, typed against the payload map so types and schemas agree. */
const FIXTURES: {
  [K in keyof AlertZeroTelemetryEventPayloads]: AlertZeroTelemetryEventPayloads[K];
} = {
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerRunCompleted]: {
    ...envelope,
    alerts_analyzed: 120,
    attacks_generated: 4,
    attacks_persisted: 3,
    batches_failed: 0,
    batches_total: 2,
    run_outcome: 'produced',
  },
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted]: {
    ...envelope,
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    is_rereview: false,
  },
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerAnalysisCompleted]: {
    ...envelope,
    analysis_error: false,
    verdict: 'true_positive',
  },
  [ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved]: {
    ...envelope,
    auto_approve_requested: true,
    outcome: 'approved',
    verdict: 'true_positive',
  },
  [ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed]: {
    ...envelope,
    close_reason: 'false_positive',
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
  },
  [ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationReopened]: {
    investigation_id: '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b',
    is_default_space: false,
    watch_tag: 'watch-hunt',
    worker_id: 'system-security-hunt-continuous-threat-hunt',
  },
  [ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted]: {
    ...envelope,
    candidates_found: 12,
    degraded: true,
    degraded_reason: 'dependency_unavailable',
    items_dispatched: 5,
    items_failed: 0,
    items_in_flight: 3,
    lookup_failed: true,
    run_outcome: 'produced',
    source_read_failed: false,
    watch_tag: 'watch-detection',
    worker_id: 'system-security-detection-rule-coverage',
  },
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified]: {
    ...envelope,
    alerts_total: 40,
    alerts_without_verdict: 2,
    fp_below_floor: 3,
    fp_candidates: 20,
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    verdicts_false_positive: 23,
    verdicts_inconclusive: 5,
    verdicts_true_positive: 10,
    worker_id: 'system-security-floor-alert-triage',
  },
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchGrouped]: {
    ...envelope,
    alerts_joined: 0,
    alerts_pooled: 0,
    alerts_with_strict_key: 36,
    conversation_created: false,
    fp_candidates_on_fallback: 4,
    proposals_created: 0,
    strict_keys: 12,
    strict_keys_single_alert: 5,
    wide_keys: 8,
    wide_keys_single_alert: 3,
    worker_id: 'system-security-floor-alert-triage',
  },
  [ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved]: {
    ...envelope,
    alerts_proposed: 20,
    alerts_retag_failed: 0,
    auto_approve_requested: true,
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    outcome: 'approved',
    proposal_read_failed: false,
    worker_id: 'system-security-floor-alert-triage',
  },
  [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted]: {
    ...envelope,
    applied: true,
    approved_not_applied: false,
    backtest_ran: true,
    backtest_reduced_alerts: true,
    change_type: 'exception',
    confidence: 'medium',
    decision: 'approved',
    entry_gate: 'approved',
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    rule_source: 'custom',
    rule_type: 'esql',
    rule_unavailable: false,
    watch_tag: 'watch-detection',
    worker_id: 'system-security-detection-rule-tuning',
  },
  [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted]: {
    ...envelope,
    applied: true,
    approved_not_applied: false,
    check_failed: false,
    creation_failed: false,
    creation_skipped: false,
    decision: 'approved',
    entry_gate: 'skipped',
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    ki_processed: true,
    proposal_kind: 'enable_rule',
    rule_created: false,
    rule_source: 'prebuilt',
    rule_type: 'eql',
    verdict: 'covered_disabled',
    watch_tag: 'watch-detection',
    worker_id: 'system-security-detection-rule-coverage',
  },
  [ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted]: {
    ...envelope,
    closed_clean: true,
    coverage_kis_skipped: 0,
    coverage_kis_written: 2,
    has_confirmed_hit: false,
    hunt_status: 'success',
    investigation_id: '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b',
    mint_suppression: 'none',
    package_status: 'success',
    proposals_dispatch_failed: 0,
    proposals_prepared: 0,
    tier2_invoked: false,
    watch_tag: 'watch-hunt',
    worker_id: 'system-security-hunt-continuous-threat-hunt',
  },
  [ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted]: {
    ...envelope,
    actions_recommended: 2,
    agent_failed: false,
    analysis_outcome: 'processed',
    auto_approve_requested: false,
    findings_attached: true,
    host_resolved: true,
    iocs_found: true,
    proposals_dispatch_failed: 0,
    proposals_dispatched: 2,
    reused_prior_assessment: false,
    timeline_found: true,
    watch_tag: 'watch-forensics',
    worker_id: 'system-security-forensics-endpoint-analysis',
  },
};

const README_PATH = join(__dirname, 'README.md');

/** Event names documented as `### \`alertzero_…\`` headings in the telemetry README. */
const readDocumentedEventNames = (): string[] =>
  Array.from(readFileSync(README_PATH, 'utf8').matchAll(/^### `(alertzero_[a-z0-9_]+)`\s*$/gm)).map(
    ([, eventName]) => eventName
  );

/** The README text under one event's `### \`alertzero_…\`` heading, up to the next heading. */
const readDocumentedEventSection = (eventName: string): string => {
  const [, afterHeading = ''] = readFileSync(README_PATH, 'utf8').split(`### \`${eventName}\`\n`);
  const [section] = afterHeading.split(/^#{2,3} /m);
  return section;
};

const registeredEventNames = ALERTZERO_TELEMETRY_EVENT_TYPES.map(({ eventType }) => eventType);

describe('AlertZero telemetry event types', () => {
  it('registers exactly the events in the event name map', () => {
    expect([...registeredEventNames].sort()).toEqual(
      Object.values(ALERTZERO_TELEMETRY_EVENTS).sort()
    );
  });

  it('registers no Investigation lifecycle event, which nothing in AlertZero emits', () => {
    expect(
      registeredEventNames.filter((eventName) =>
        eventName.startsWith(`${ALERTZERO_TELEMETRY_PREFIX}_investigation_`)
      )
    ).toEqual([]);
  });

  it('registers each event name once', () => {
    expect(new Set(registeredEventNames).size).toBe(registeredEventNames.length);
  });

  it.each(registeredEventNames.map((eventName) => [eventName]))(
    'prefixes %s with the plugin prefix',
    (eventName) => {
      expect(eventName.startsWith(`${ALERTZERO_TELEMETRY_PREFIX}_`)).toBe(true);
    }
  );

  describe.each(ALERTZERO_TELEMETRY_EVENT_TYPES.map((opts) => [opts.eventType, opts]))(
    '%s schema',
    (_eventType, { schema }) => {
      const fields = collectFields(schema as Record<string, unknown>);

      it('declares at least one field', () => {
        expect(fields.length).toBeGreaterThan(0);
      });

      it('gives every field a non-empty description', () => {
        const undescribed = fields
          .filter(({ node }) => {
            const description = getDescription(node);
            return typeof description !== 'string' || description.trim().length === 0;
          })
          .map(({ path }) => path);

        expect(undescribed).toEqual([]);
      });

      it('uses no `text` field', () => {
        const textFields = fields
          .filter(
            ({ node }) =>
              node.type === 'text' || (isRecord(node.items) && node.items.type === 'text')
          )
          .map(({ path }) => path);

        expect(textFields).toEqual([]);
      });

      it('declares no denylisted identity or free-text field name', () => {
        const denylisted = fields
          .filter(({ path }) => DENYLISTED_FIELD_NAMES.includes(getLeafName(path)))
          .map(({ path }) => path);

        expect(denylisted).toEqual([]);
      });

      it('uses no `pass_through` field, keeping the schema closed', () => {
        const passThrough = fields
          .filter(({ node }) => node.type === 'pass_through')
          .map(({ path }) => path);

        expect(passThrough).toEqual([]);
      });
    }
  );

  describe('README', () => {
    it('documents every registered event', () => {
      const documented = readDocumentedEventNames();

      expect(registeredEventNames.filter((eventName) => !documented.includes(eventName))).toEqual(
        []
      );
    });

    it('documents no event that is not registered', () => {
      const documented = readDocumentedEventNames();

      expect(documented.filter((eventName) => !registeredEventNames.includes(eventName))).toEqual(
        []
      );
    });

    it('has a privacy contract section', () => {
      expect(readFileSync(README_PATH, 'utf8')).toMatch(/^## Privacy contract$/m);
    });
  });

  describe('trigger_type', () => {
    it("documents that `workflow_step` is the engine's `workflow-step`", () => {
      const description = String(
        getDescription(
          ALERTZERO_AD_WORKER_RUN_COMPLETED_EVENT.schema.trigger_type as unknown as Record<
            string,
            unknown
          >
        )
      );
      const readme = readFileSync(README_PATH, 'utf8');

      expect({
        readme: ['`workflow_step`', '`workflow-step`'].every((value) => readme.includes(value)),
        schema: ['`workflow_step`', '`workflow-step`'].every((value) =>
          description.includes(value)
        ),
      }).toEqual({ readme: true, schema: true });
    });
  });

  describe('alertzero_worker_investigation_closed', () => {
    const { schema } = ALERTZERO_WORKER_INVESTIGATION_CLOSED_EVENT;

    it('carries the envelope plus only the Investigation id and close reason', () => {
      expect(Object.keys(schema).sort()).toEqual(
        [...Object.keys(envelope), 'close_reason', 'investigation_id'].sort()
      );
    });

    it.each([['close_reason'], ['investigation_id']] as const)('requires %s', (field) => {
      expect(schema[field]._meta).toEqual(expect.objectContaining({ optional: false }));
    });

    it('documents every Investigation template close reason in the schema and README', () => {
      const description = String(
        getDescription(schema.close_reason as unknown as Record<string, unknown>)
      );
      const section = readDocumentedEventSection(
        ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed
      );

      expect({
        readme: INVESTIGATION_CLOSE_REASONS.filter((reason) => !section.includes(`\`${reason}\``)),
        schema: INVESTIGATION_CLOSE_REASONS.filter(
          (reason) => !description.includes(`\`${reason}\``)
        ),
      }).toEqual({ readme: [], schema: [] });
    });

    it.each(INVESTIGATION_CLOSE_REASONS.map((reason) => [reason]))(
      'accepts a %s close in dev mode',
      (closeReason) => {
        const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
        registerAlertZeroTelemetryEvents(analytics);

        expect(() =>
          analytics.reportEvent(ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed, {
            ...FIXTURES[ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed],
            close_reason: closeReason,
          })
        ).not.toThrow();
      }
    );

    it.each([['close_reason'], ['investigation_id']] as const)(
      'rejects a payload without %s in dev mode',
      (field) => {
        const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
        registerAlertZeroTelemetryEvents(analytics);
        const { [field]: _omitted, ...payload } =
          FIXTURES[ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed];

        expect(() =>
          analytics.reportEvent(ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed, payload)
        ).toThrow();
      }
    );
  });

  describe('fields every Worker always sends', () => {
    const ALWAYS_SENT = [
      [ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted, 'investigation_id'],
      [ALERTZERO_TELEMETRY_EVENTS.AdWorkerReviewStarted, 'is_rereview'],
      [ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved, 'auto_approve_requested'],
      [ALERTZERO_TELEMETRY_EVENTS.AdWorkerHandoffResolved, 'verdict'],
      [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified, 'investigation_id'],
      [ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved, 'investigation_id'],
      [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted, 'approved_not_applied'],
      [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted, 'entry_gate'],
    ] as const;

    const schemaFieldOf = (eventType: string, field: string): Record<string, unknown> => {
      const schema = (ALERTZERO_TELEMETRY_EVENT_TYPES.find((opts) => opts.eventType === eventType)
        ?.schema ?? {}) as Record<string, unknown>;
      const node = schema[field];
      return isRecord(node) && isRecord(node._meta) ? node._meta : {};
    };

    it.each(ALWAYS_SENT)('%s requires %s', (eventType, field) => {
      expect(schemaFieldOf(eventType, field)).toEqual(expect.objectContaining({ optional: false }));
    });

    it.each(ALWAYS_SENT)('%s rejects a payload without %s in dev mode', (eventType, field) => {
      const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
      registerAlertZeroTelemetryEvents(analytics);
      const { [field]: _omitted, ...payload } = FIXTURES[eventType] as unknown as Record<
        string,
        unknown
      >;

      expect(() => analytics.reportEvent(eventType, payload)).toThrow();
    });
  });

  describe('Worker run and item events', () => {
    /** Every closed-vocabulary field of the Worker run and item events, with its values. */
    const VOCABULARY_FIELDS: Array<[string, string, readonly string[]]> = [
      [ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted, 'run_outcome', WORKER_RUN_OUTCOMES],
      [ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted, 'degraded_reason', WORKER_DEGRADED_REASONS],
      [
        ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved,
        'outcome',
        ALERT_TRIAGE_CLOSURE_OUTCOMES,
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted,
        'change_type',
        RULE_TUNING_CHANGE_TYPES,
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted,
        'confidence',
        WORKER_RECOMMENDATION_CONFIDENCES,
      ],
      [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted, 'decision', WORKER_REVIEW_DECISIONS],
      [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted, 'entry_gate', RULE_REVIEW_ENTRY_GATES],
      [
        ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
        'entry_gate',
        RULE_REVIEW_ENTRY_GATES,
      ],
      [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted, 'decision', WORKER_REVIEW_DECISIONS],
      [
        ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
        'proposal_kind',
        RULE_COVERAGE_PROPOSAL_KINDS,
      ],
      [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted, 'verdict', RULE_COVERAGE_VERDICTS],
      [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted, 'rule_type', DETECTION_RULE_TYPES],
      [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted, 'rule_source', DETECTION_RULE_SOURCES],
      [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted, 'rule_type', DETECTION_RULE_TYPES],
      [
        ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
        'rule_source',
        DETECTION_RULE_SOURCES,
      ],
      [ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted, 'hunt_status', HUNT_REPORT_HUNT_STATUSES],
      [
        ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted,
        'mint_suppression',
        HUNT_REPORT_MINT_SUPPRESSIONS,
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted,
        'package_status',
        HUNT_REPORT_PACKAGE_STATUSES,
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted,
        'analysis_outcome',
        ENDPOINT_ANALYSIS_OUTCOMES,
      ],
    ];

    const schemaOf = (eventType: string): Record<string, unknown> =>
      (ALERTZERO_TELEMETRY_EVENT_TYPES.find((opts) => opts.eventType === eventType)?.schema ??
        {}) as Record<string, unknown>;

    it.each(VOCABULARY_FIELDS)(
      '%s %s lists its whole vocabulary in the schema and README',
      (eventType, field, values) => {
        const node = schemaOf(eventType)[field];
        const description = String(isRecord(node) ? getDescription(node) : '');
        const section = readDocumentedEventSection(eventType);

        expect({
          readme: values.filter((value) => !section.includes(`\`${value}\``)),
          schema: values.filter((value) => !description.includes(`\`${value}\``)),
        }).toEqual({ readme: [], schema: [] });
      }
    );

    it.each(
      VOCABULARY_FIELDS.flatMap(([eventType, field, values]) =>
        values.map((value): [string, string, string] => [eventType, field, value])
      )
    )('%s accepts %s %s in dev mode', (eventType, field, value) => {
      const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
      registerAlertZeroTelemetryEvents(analytics);

      expect(() =>
        analytics.reportEvent(eventType, {
          ...FIXTURES[eventType as keyof AlertZeroTelemetryEventPayloads],
          [field]: value,
        })
      ).not.toThrow();
    });

    it.each([
      [ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted],
      [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchClassified],
      [ALERTZERO_TELEMETRY_EVENTS.AlertTriageBatchGrouped],
      [ALERTZERO_TELEMETRY_EVENTS.AlertTriageClosureResolved],
      [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted],
      [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted],
      [ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted],
      [ALERTZERO_TELEMETRY_EVENTS.EndpointAnalysisCompleted],
    ])('%s carries the full run envelope', (eventType) => {
      expect(Object.keys(envelope).filter((key) => !(key in schemaOf(eventType)))).toEqual([]);
    });

    /** The events whose Investigation id is absent in one case, and the field that names it. */
    const CONDITIONAL_INVESTIGATION_IDS = [
      [ALERTZERO_TELEMETRY_EVENTS.RuleTuningReviewCompleted, 'rule_unavailable'],
      [ALERTZERO_TELEMETRY_EVENTS.RuleCoverageReviewCompleted, 'check_failed'],
      [ALERTZERO_TELEMETRY_EVENTS.HuntReportCompleted, 'run_incomplete'],
    ] as const;

    it.each(CONDITIONAL_INVESTIGATION_IDS)(
      '%s accepts a payload without its Investigation id',
      (eventType) => {
        const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
        registerAlertZeroTelemetryEvents(analytics);
        const { investigation_id: _omitted, ...payload } = FIXTURES[eventType];

        expect(() => analytics.reportEvent(eventType, payload)).not.toThrow();
      }
    );

    it.each(CONDITIONAL_INVESTIGATION_IDS)(
      '%s documents that its Investigation id is absent only with %s',
      (eventType, condition) => {
        const node = schemaOf(eventType).investigation_id;
        const description = String(isRecord(node) ? getDescription(node) : '');

        expect(description).toContain(`\`${condition}\``);
      }
    );

    it('rejects a Worker run payload without its run outcome in dev mode', () => {
      const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
      registerAlertZeroTelemetryEvents(analytics);
      const { run_outcome: _omitted, ...payload } =
        FIXTURES[ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted];

      expect(() =>
        analytics.reportEvent(ALERTZERO_TELEMETRY_EVENTS.WorkerRunCompleted, payload)
      ).toThrow();
    });
  });

  describe('audit separation', () => {
    const sourceFiles = listSourceFiles(__dirname);

    it('scans the telemetry sources', () => {
      expect(sourceFiles.length).toBeGreaterThan(0);
    });

    it.each(sourceFiles.map((filePath) => [filePath.replace(`${__dirname}/`, ''), filePath]))(
      '%s imports neither KibanaRequest nor ProposalUser',
      (_relativePath, filePath) => {
        const forbidden = collectImportedNames(filePath).filter((name) =>
          FORBIDDEN_IMPORTS.includes(name)
        );

        expect(forbidden).toEqual([]);
      }
    );
  });

  describe('dev-mode schema conformance', () => {
    const createRegisteredAnalytics = () => {
      const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
      registerAlertZeroTelemetryEvents(analytics);
      return analytics;
    };

    it.each(Object.entries(FIXTURES))('accepts a valid %s payload', (eventType, payload) => {
      const analytics = createRegisteredAnalytics();

      expect(() => analytics.reportEvent(eventType, payload)).not.toThrow();
    });

    it.each(Object.entries(FIXTURES))(
      'rejects a %s payload carrying an undeclared field',
      (eventType, payload) => {
        const analytics = createRegisteredAnalytics();

        expect(() =>
          analytics.reportEvent(eventType, { ...payload, space_id: 'security-team' })
        ).toThrow();
      }
    );
  });
});
