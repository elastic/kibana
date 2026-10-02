/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  boundedExcerptRt,
  nonEmptyStringRt,
  repositoryRelativePathRt,
} from '../source_location_codec';
import { candidateIdRt } from './candidate_id_codec';

/** Maximum candidates admitted in one future caller-batched classification workflow request. */
export const MAX_CLASSIFICATION_CANDIDATES = 200;
/** Maximum source locations retained for one classification candidate. */
export const MAX_CLASSIFICATION_EVIDENCE = 8;
/** Maximum UTF-8 bytes retained for any model-visible source excerpt. */
export const MAX_CLASSIFICATION_EXCERPT_BYTES = 4_096;
/** Maximum UTF-8 bytes sent to any classification workflow request. */
export const MAX_WORKFLOW_REQUEST_BYTES = 262_144;
/** Maximum repository-relative path length exposed to a workflow. */
export const MAX_WORKFLOW_PATH_LENGTH = 512;
/** Maximum language label length accepted by the workflow schemas. */
export const MAX_WORKFLOW_LANGUAGE_LENGTH = 512;
/** Maximum literal signal value length accepted by the workflow schemas. */
export const MAX_WORKFLOW_SIGNAL_VALUE_LENGTH = 4_096;
/** Complete normalized vocabulary emitted by deterministic log signature extraction. */
export const normalizedLogLevels = [
  'critical',
  'debug',
  'error',
  'fatal',
  'fine',
  'info',
  'severe',
  'trace',
  'warn',
] as const;

/** Counts UTF-8 bytes without depending on Node APIs in the shared package. */
const utf8Bytes = (value: string): number => new TextEncoder().encode(value).byteLength;

/** Bounds workflow-visible source excerpts below the larger persistence evidence allowance. */
const workflowExcerptRt = t.refinement(
  boundedExcerptRt,
  (value) => utf8Bytes(value) <= MAX_CLASSIFICATION_EXCERPT_BYTES,
  'WorkflowExcerpt'
);

/** Bounds workflow-visible paths while retaining repository-relative-path validation. */
const workflowPathRt = t.refinement(
  repositoryRelativePathRt,
  (value) =>
    value.length <= MAX_WORKFLOW_PATH_LENGTH && utf8Bytes(value) <= MAX_WORKFLOW_PATH_LENGTH,
  'WorkflowPath'
);

/** Bounds optional source-language labels to the installed workflow schema limit. */
const workflowLanguageRt = t.refinement(
  nonEmptyStringRt,
  (value) => value.length <= MAX_WORKFLOW_LANGUAGE_LENGTH,
  'WorkflowLanguage'
);

/** Bounds literal signal values to the installed workflow schema limit. */
const workflowSignalValueRt = t.refinement(
  nonEmptyStringRt,
  (value) => value.length <= MAX_WORKFLOW_SIGNAL_VALUE_LENGTH,
  'WorkflowSignalValue'
);

/** Validates the bounded source evidence shape that can cross the workflow boundary. */
const workflowSourceLocationRt = t.type({
  excerpt: workflowExcerptRt,
  line: t.refinement(t.number, (value) => Number.isSafeInteger(value) && value > 0, 'PositiveLine'),
  path: workflowPathRt,
});

/** Bounds a workflow array by item count without silently sampling its contents. */
const boundedWorkflowArray = <Value extends t.Mixed>(codec: Value, maximum: number, name: string) =>
  t.refinement(t.readonlyArray(codec), (value) => value.length <= maximum, name);

/** Validates logging evidence supplied to classification. */
export const loggingClassificationCandidateRt = t.intersection([
  t.type({
    evidence: boundedWorkflowArray(
      workflowSourceLocationRt,
      MAX_CLASSIFICATION_EVIDENCE,
      'LoggingEvidence'
    ),
    excerpt: workflowExcerptRt,
    id: candidateIdRt,
  }),
  t.partial({ language: workflowLanguageRt }),
]);

/** A logging candidate validated before it is sent to the classification workflow. */
export type LoggingClassificationCandidate = t.TypeOf<typeof loggingClassificationCandidateRt>;

/** Validates a batch of logging candidates for workflow input. */
export const loggingClassificationRequestRt = t.type({
  candidates: boundedWorkflowArray(
    loggingClassificationCandidateRt,
    MAX_CLASSIFICATION_CANDIDATES,
    'LoggingCandidates'
  ),
});
export type LoggingClassificationRequest = t.TypeOf<typeof loggingClassificationRequestRt>;

/** Restricts model-selected log levels to the normalized levels accepted by deterministic generation. */
export const logLevelRt = t.keyof({
  critical: null,
  debug: null,
  error: null,
  fatal: null,
  fine: null,
  info: null,
  severe: null,
  trace: null,
  warn: null,
});

/** Maximum length of a reviewer-facing finding title returned by a classifier. */
export const MAX_FINDING_TITLE_LENGTH = 160;
/** Maximum length of a reviewer-facing finding summary returned by a classifier. */
export const MAX_FINDING_SUMMARY_LENGTH = 600;

/** Restricts findings to the single review category a classifier may file. */
export const findingTypeRt = t.keyof({ 'sensitive-data': null });
export type FindingType = t.TypeOf<typeof findingTypeRt>;

/** Bounds a finding title so a reviewer list stays readable. */
const findingTitleRt = t.refinement(
  nonEmptyStringRt,
  (value) => value.length <= MAX_FINDING_TITLE_LENGTH,
  'FindingTitle'
);

/** Bounds a finding summary so a reviewer list stays readable. */
const findingSummaryRt = t.refinement(
  nonEmptyStringRt,
  (value) => value.length <= MAX_FINDING_SUMMARY_LENGTH,
  'FindingSummary'
);

/**
 * Optional finding fields shared by both classifiers. They stay flat because
 * duplicate answers are compared field by field with strict equality.
 */
const classificationFindingFieldsRt = t.partial({
  findingSummary: findingSummaryRt,
  findingTitle: findingTitleRt,
  findingType: findingTypeRt,
});
export type ClassificationFindingFields = t.TypeOf<typeof classificationFindingFieldsRt>;

/** A finding is only usable when the classifier supplied its type, title, and summary together. */
export const hasCompleteFinding = (
  value: ClassificationFindingFields
): value is Required<ClassificationFindingFields> =>
  value.findingType !== undefined &&
  value.findingTitle !== undefined &&
  value.findingSummary !== undefined;

/** Rejects answers that carry only some of the finding fields, like any other invalid result. */
const findingFieldsTogether = (value: ClassificationFindingFields): boolean =>
  hasCompleteFinding(value) ||
  (value.findingType === undefined &&
    value.findingTitle === undefined &&
    value.findingSummary === undefined);

/** Validates model decisions allowed for a logging candidate. */
export const loggingClassificationRt = t.refinement(
  t.exact(
    t.intersection([
      t.type({ id: candidateIdRt, keep: t.boolean }),
      t.partial({ level: logLevelRt, staticMessage: nonEmptyStringRt }),
      classificationFindingFieldsRt,
    ])
  ),
  findingFieldsTogether,
  'LoggingClassification'
);
export type LoggingClassification = t.TypeOf<typeof loggingClassificationRt>;

/** Validates the bounded metadata describing an OTel signal. */
export const otelSignalMetadataRt = t.intersection([
  t.type({
    kind: t.keyof({
      attr_key: null,
      error_status: null,
      event_name: null,
      metric_name: null,
      record_exception: null,
      span_name: null,
    }),
  }),
  t.partial({
    metricKind: t.keyof({ counter: null, gauge: null, histogram: null, updown: null }),
    templated: t.boolean,
    value: workflowSignalValueRt,
    valueHint: t.keyof({ bool: null, enum: null, id: null, number: null, unknown: null }),
  }),
]);
export type OtelSignalMetadata = t.TypeOf<typeof otelSignalMetadataRt>;

/** Validates OTel evidence and signal metadata for classification. */
export const otelClassificationCandidateRt = t.type({
  evidence: boundedWorkflowArray(
    workflowSourceLocationRt,
    MAX_CLASSIFICATION_EVIDENCE,
    'OtelEvidence'
  ),
  id: candidateIdRt,
  signal: otelSignalMetadataRt,
});
export type OtelClassificationCandidate = t.TypeOf<typeof otelClassificationCandidateRt>;

/** Validates a batch of OTel candidates for workflow input. */
export const otelClassificationRequestRt = t.type({
  candidates: boundedWorkflowArray(
    otelClassificationCandidateRt,
    MAX_CLASSIFICATION_CANDIDATES,
    'OtelCandidates'
  ),
});
export type OtelClassificationRequest = t.TypeOf<typeof otelClassificationRequestRt>;

/** Restricts classification severity to an integer percentage from 0 to 100. */
export const severityScoreRt = t.refinement(
  t.number,
  (value) => Number.isInteger(value) && value >= 0 && value <= 100,
  'SeverityScore'
);
/** Validates model decisions allowed for an OTel candidate. */
export const otelClassificationRt = t.refinement(
  t.exact(
    t.intersection([
      t.type({ id: candidateIdRt, keep: t.boolean }),
      t.partial({
        description: nonEmptyStringRt,
        severityScore: severityScoreRt,
        title: nonEmptyStringRt,
      }),
      classificationFindingFieldsRt,
    ])
  ),
  findingFieldsTogether,
  'OtelClassification'
);
export type OtelClassification = t.TypeOf<typeof otelClassificationRt>;
