/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  INVESTIGATION_SUBJECT_TRIGGER_TYPES,
  INVESTIGATION_SUBJECT_TYPES,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_SUBJECT_ID_LENGTH,
  MAX_SUBJECTS_PER_REQUEST,
} from '@kbn/agentic-investigations-plugin/common';
import type {
  InvestigationSubject as StoredInvestigationSubject,
  InvestigationSubjectKey,
} from '@kbn/agentic-investigations-plugin/common';
import type { AlertSnapshot, InvestigationSubject, InvestigationTriggerType } from '../../common';
import {
  alertInvestigationContextSchema,
  alertSnapshotSchema,
  DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID,
  INVESTIGATION_TRIGGER_TYPES,
} from '../../common';
import { buildInvestigationMessage } from './build_investigation_message';

const MAX_SLACK_FIELD_LENGTH = 256;
const MAX_SLACK_PERMALINK_LENGTH = 2048;

/**
 * A subject the start path hands to the investigation workflow in `inputs.subjects`, recorded on
 * the investigation by the workflow's `_ensure` step. The workflow runs as the identity that owns
 * the investigation conversation, so every write to it happens there rather than with the start
 * caller's request. Agentic investigations validates these again when it stores them.
 */
export const workflowSubjectInputSchema = z.object({
  type: z.enum(INVESTIGATION_SUBJECT_TYPES),
  id: z.string().min(1).max(MAX_SUBJECT_ID_LENGTH),
  summary: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  triggerType: z.enum(INVESTIGATION_SUBJECT_TRIGGER_TYPES).optional(),
  snapshot: alertSnapshotSchema.optional(),
  slack: z
    .object({
      channel: z.string().min(1).max(MAX_SLACK_FIELD_LENGTH),
      thread_ts: z.string().min(1).max(MAX_SLACK_FIELD_LENGTH),
      status_message_ts: z.string().min(1).max(MAX_SLACK_FIELD_LENGTH).optional(),
      permalink: z.string().max(MAX_SLACK_PERMALINK_LENGTH).optional(),
    })
    .optional(),
});

export type WorkflowSubjectInput = z.infer<typeof workflowSubjectInputSchema>;

export const workflowSubjectInputsSchema = z
  .array(workflowSubjectInputSchema)
  .max(MAX_SUBJECTS_PER_REQUEST);

const truncateSummary = (summary: string | undefined): string | undefined =>
  summary ? summary.slice(0, MAX_EVIDENCE_TEXT_LENGTH) : undefined;

/** True for the placeholder a manual investigation carries when the caller names no subject id. */
const isPlaceholderManualSubject = ({ type, id }: Pick<InvestigationSubject, 'type' | 'id'>) =>
  type === 'manual' && id === DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID;

/**
 * The subjects one start records: the named subject and, for an alert investigation, one subject
 * per alert snapshot, each carrying its snapshot. A manual investigation without a subject id is
 * recorded under the investigation's own id, so it never matches another investigation.
 */
export const toStartSubjects = ({
  subject,
  alerts = [],
  triggerType,
  investigationId,
}: {
  subject: InvestigationSubject;
  alerts?: AlertSnapshot[];
  triggerType: InvestigationTriggerType;
  investigationId: string;
}): WorkflowSubjectInput[] => {
  const primaryId = isPlaceholderManualSubject(subject) ? investigationId : subject.id;
  const summary = truncateSummary(subject.summary);
  const primary: WorkflowSubjectInput = {
    type: subject.type,
    id: primaryId,
    triggerType,
    ...(summary ? { summary } : {}),
  };

  if (subject.type !== 'alert') {
    return [primary];
  }

  const fromAlerts = alerts.map(
    (snapshot): WorkflowSubjectInput => ({
      type: 'alert',
      id: snapshot.id,
      triggerType,
      snapshot,
      ...(snapshot.id === subject.id && summary ? { summary } : {}),
    })
  );
  return fromAlerts.some(({ id }) => id === subject.id) ? fromAlerts : [primary, ...fromAlerts];
};

/** The keys a start matches open investigations and claims subjects by. */
export const toSubjectKeys = (
  subjects: WorkflowSubjectInput[],
  investigationId: string
): InvestigationSubjectKey[] =>
  subjects
    .filter(({ type, id }) => !(type === 'manual' && id === investigationId))
    .map(({ type, id }) => ({ type, id }));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

const SUBJECT_ID_FIELDS = {
  significant_event: 'significant_event_id',
  alert: 'alert_id',
  manual: 'manual_id',
} as const satisfies Record<InvestigationSubject['type'], string>;

const isNightshiftSubjectType = (value: unknown): value is InvestigationSubject['type'] =>
  typeof value === 'string' && Object.keys(SUBJECT_ID_FIELDS).includes(value);

const isTriggerType = (value: unknown): value is InvestigationTriggerType =>
  typeof value === 'string' && INVESTIGATION_TRIGGER_TYPES.some((type) => type === value);

/**
 * The subjects a run of the investigation workflow records. A start passes them in
 * `inputs.subjects`; a run started any other way (for example manually from the workflows UI)
 * carries only `inputs.context`, whose `source`, `<source>_id`, `summary`, and alert snapshots
 * describe the subject the same way the start path does.
 */
export const recoverSubjectsFromInputs = (
  inputs: Record<string, unknown> | undefined,
  investigationId: string
): WorkflowSubjectInput[] => {
  const fromInputs = workflowSubjectInputsSchema.safeParse(inputs?.subjects);
  if (fromInputs.success && fromInputs.data.length > 0) {
    return fromInputs.data;
  }

  const context = inputs?.context;
  if (!isPlainObject(context) || !isNightshiftSubjectType(context.source)) {
    return [];
  }
  const subjectId = asString(context[SUBJECT_ID_FIELDS[context.source]]);
  if (!subjectId) {
    return [];
  }
  const alerts =
    context.source === 'alert'
      ? alertInvestigationContextSchema.shape.alerts.safeParse(context.alerts)
      : undefined;

  return toStartSubjects({
    subject: { type: context.source, id: subjectId, summary: asString(context.summary) },
    alerts: alerts?.success ? alerts.data : [],
    triggerType: isTriggerType(context.trigger_type) ? context.trigger_type : 'manual',
    investigationId,
  });
};

/** The subjects not yet recorded on the investigation. */
export const withoutRecordedSubjects = (
  subjects: WorkflowSubjectInput[],
  recorded: StoredInvestigationSubject[]
): WorkflowSubjectInput[] =>
  subjects.filter(
    ({ type, id }) =>
      !recorded.some(({ subjectType, subjectId }) => subjectType === type && subjectId === id)
  );

const FOLLOW_UP_PREAMBLE =
  'This continues the investigation in this conversation. Build on your previous findings, check whether the new information changes them, and update the investigation with your tools.';

/**
 * The brief for a start that follows up on an open investigation. For alerts it describes the
 * alerts the investigation does not hold yet; when every alert is already part of it, the alerts
 * fired again, so their current state is described instead.
 */
export const buildFollowUpMessage = ({
  subject,
  message,
  alerts,
  newAlerts,
}: {
  subject: InvestigationSubject;
  message: string;
  alerts: AlertSnapshot[];
  newAlerts: AlertSnapshot[];
}): string => {
  if (subject.type !== 'alert' || alerts.length === 0) {
    return `${FOLLOW_UP_PREAMBLE}\n\n${message}`;
  }
  if (newAlerts.length > 0) {
    return `${FOLLOW_UP_PREAMBLE} New alerts joined it.\n\n${buildInvestigationMessage({
      alerts: newAlerts,
    })}`;
  }
  return `${FOLLOW_UP_PREAMBLE} Alerts that are already part of it were reported again.\n\n${buildInvestigationMessage(
    { alerts }
  )}`;
};
