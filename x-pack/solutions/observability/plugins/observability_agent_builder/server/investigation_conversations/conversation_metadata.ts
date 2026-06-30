/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';

export interface ObservabilityInvestigationTimelineEntry {
  at: string;
  actor: string;
  summary: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface NormalizeTimelineInputOptions {
  value: unknown;
  now: string;
  actor: string;
  source: string;
}

interface BuildInvestigationCustomFieldsOptions {
  now: string;
  title?: string;
  serviceName?: string;
  workflowExecutionId?: string;
  workflowId?: string;
  connectorId?: string;
  initialContext?: string;
  report?: string;
  currentState?: string;
  severity?: string;
  status?: string;
  timeline?: unknown;
  workflowHooks?: unknown;
  metadata?: Record<string, unknown>;
}

interface BuildManualRefreshFieldsOptions {
  customFields: Record<string, unknown>;
  now: string;
  currentState?: string;
  outcome?: string;
  status?: string;
  timeline?: unknown;
  workflowHooks?: unknown;
  metadata?: Record<string, unknown>;
}

interface BuildIncidentRefreshFieldsOptions {
  customFields: Record<string, unknown>;
  now: string;
  investigationConversationId: string;
  currentState?: string;
  outcome?: string;
  timeline?: unknown;
}

const USER_ACTOR = 'investigation user';
const UPDATER_ACTOR = 'observability investigation updater';
const INCIDENT_ACTOR = 'incident lifecycle';
const INVESTIGATION_WORKFLOW_ACTOR = 'investigation workflow';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeWorkflowHooks = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const getIncidentContextFields = (
  investigationFields: Record<string, unknown>
): Record<string, unknown> => {
  const incidentFields = { ...investigationFields };
  delete incidentFields.timeline;
  delete incidentFields.workflow_hook_state;
  delete incidentFields.incident_conversation_id;
  return incidentFields;
};

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getSummaryFromRecord = (record: Record<string, unknown>): string => {
  return (
    getString(record.summary) ??
    getString(record.message) ??
    getString(record.description) ??
    getString(record.event) ??
    stringifyValue(record)
  );
};

const normalizeTimelineEntry = (
  value: unknown,
  fallback: Omit<ObservabilityInvestigationTimelineEntry, 'summary'>
): ObservabilityInvestigationTimelineEntry | undefined => {
  if (value == null) {
    return undefined;
  }

  if (isRecord(value)) {
    const summary = getSummaryFromRecord(value);
    return {
      at: getString(value.at) ?? getString(value.timestamp) ?? getString(value.time) ?? fallback.at,
      actor: getString(value.actor) ?? fallback.actor,
      source: getString(value.source) ?? fallback.source,
      summary,
      metadata: isRecord(value.metadata) ? value.metadata : value,
    };
  }

  return {
    ...fallback,
    summary: stringifyValue(value),
  };
};

export const normalizeTimelineInput = ({
  value,
  now,
  actor,
  source,
}: NormalizeTimelineInputOptions): ObservabilityInvestigationTimelineEntry[] => {
  const fallback = { at: now, actor, source };

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeTimelineEntry(entry, fallback))
      .filter((entry): entry is ObservabilityInvestigationTimelineEntry => entry !== undefined);
  }

  const entry = normalizeTimelineEntry(value, fallback);
  return entry ? [entry] : [];
};

export const getTimelineFromCustomFields = (
  customFields: Record<string, unknown>,
  now: string
): ObservabilityInvestigationTimelineEntry[] => {
  return normalizeTimelineInput({
    value: customFields.timeline,
    now,
    actor: UPDATER_ACTOR,
    source: 'custom_fields',
  });
};

export const appendTimelineEntries = ({
  customFields,
  entries,
  now,
}: {
  customFields: Record<string, unknown>;
  entries: ObservabilityInvestigationTimelineEntry[];
  now: string;
}): Record<string, unknown> => {
  return {
    ...customFields,
    timeline: [...getTimelineFromCustomFields(customFields, now), ...entries],
  };
};

export const buildInvestigationCustomFields = ({
  now,
  serviceName,
  workflowExecutionId,
  workflowId,
  connectorId,
  initialContext,
  report,
  currentState,
  severity,
  status,
  timeline,
  workflowHooks,
  metadata,
}: BuildInvestigationCustomFieldsOptions): Record<string, unknown> => {
  const timelineEntries = normalizeTimelineInput({
    value: timeline,
    now,
    actor: USER_ACTOR,
    source: 'incident',
  });
  const nextCurrentState =
    currentState ??
    report ??
    timelineEntries[timelineEntries.length - 1]?.summary ??
    'Investigation complete';

  return {
    status: status ?? 'complete',
    severity: severity ?? 'medium',
    current_state: nextCurrentState,
    last_refreshed_at: now,
    ...(serviceName ? { service_name: serviceName } : {}),
    ...(workflowExecutionId ? { workflow_execution_id: workflowExecutionId } : {}),
    ...(workflowId ? { workflow_id: workflowId } : {}),
    ...(connectorId ? { connector_id: connectorId } : {}),
    ...(initialContext ? { initial_context: initialContext } : {}),
    ...(report ? { outcome: report } : {}),
    ...(workflowHooks ? { workflow_hooks: normalizeWorkflowHooks(workflowHooks) } : {}),
    ...(metadata ? { workflow_metadata: metadata } : {}),
  };
};

export const buildInvestigationSeedMessage = (customFields: Record<string, unknown>): string => {
  const serviceName = getString(customFields.service_name);
  const currentState = getString(customFields.current_state);
  const outcome = getString(customFields.outcome);

  return [
    'Investigation workflow finished. Continue here with people and agents in the context of this investigation.',
    serviceName ? `Service: ${serviceName}` : undefined,
    currentState ? `Current state: ${currentState}` : undefined,
    outcome ? `Outcome: ${outcome}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n\n');
};

export const buildIncidentCustomFields = ({
  investigation,
  now,
}: {
  investigation: Conversation;
  now: string;
}): Record<string, unknown> => {
  const investigationFields = investigation.custom_fields ?? {};

  return {
    ...getIncidentContextFields(investigationFields),
    status: 'open',
    investigation_conversation_id: investigation.id,
    related_investigations: [investigation.id],
    ...(investigationFields.outcome ? { investigation_outcome: investigationFields.outcome } : {}),
    timeline: [
      {
        at: now,
        actor: INCIDENT_ACTOR,
        source: 'incident',
        summary: 'Incident opened from investigation',
        metadata: {
          investigation_conversation_id: investigation.id,
        },
      },
    ],
  };
};

export const buildInvestigationFieldsWithIncidentLink = ({
  investigation,
  incidentConversationId,
  now,
}: {
  investigation: Conversation;
  incidentConversationId: string;
  now: string;
}): Record<string, unknown> => {
  const customFields = investigation.custom_fields ?? {};
  return {
    ...customFields,
    incident_conversation_id: incidentConversationId,
    last_refreshed_at: now,
  };
};

export const buildManualRefreshFields = ({
  customFields,
  now,
  currentState,
  outcome,
  status,
  workflowHooks,
  metadata,
}: BuildManualRefreshFieldsOptions): Record<string, unknown> => {
  const nextCurrentState =
    currentState ?? outcome ?? getString(customFields.current_state) ?? 'State refreshed';

  return {
    ...customFields,
    current_state: nextCurrentState,
    last_refreshed_at: now,
    last_state_update_source: 'manual_refresh',
    ...(status ? { status } : {}),
    ...(outcome ? { outcome } : {}),
    ...(workflowHooks ? { workflow_hooks: normalizeWorkflowHooks(workflowHooks) } : {}),
    ...(metadata ? { refresh_metadata: metadata } : {}),
  };
};

const appendUniqueString = (value: unknown, nextValue: string): string[] => {
  const values = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
  return values.includes(nextValue) ? values : [...values, nextValue];
};

export const buildIncidentFieldsFromInvestigationRefresh = ({
  customFields,
  now,
  investigationConversationId,
  currentState,
  outcome,
  timeline,
}: BuildIncidentRefreshFieldsOptions): Record<string, unknown> => {
  const timelineEntries = normalizeTimelineInput({
    value: timeline,
    now,
    actor: INVESTIGATION_WORKFLOW_ACTOR,
    source: 'investigation',
  });
  const nextCurrentState =
    currentState ??
    outcome ??
    getString(customFields.current_state) ??
    'Incident state refreshed from investigation';

  const nextFields = {
    ...customFields,
    current_state: nextCurrentState,
    last_refreshed_at: now,
    last_state_update_source: 'investigation_refresh',
    investigation_conversation_id: investigationConversationId,
    related_investigations: appendUniqueString(
      customFields.related_investigations,
      investigationConversationId
    ),
    ...(outcome ? { investigation_outcome: outcome } : {}),
  };

  return timelineEntries.length
    ? appendTimelineEntries({
        customFields: nextFields,
        entries: timelineEntries,
        now,
      })
    : nextFields;
};

export const buildPeriodicRefreshFields = ({
  customFields,
  now,
}: {
  conversationId: string;
  title?: string;
  customFields: Record<string, unknown>;
  now: string;
}): Record<string, unknown> => {
  const currentState = getString(customFields.current_state) ?? 'Investigation conversation active';
  return {
    ...customFields,
    current_state: currentState,
    last_refreshed_at: now,
    last_state_update_source: 'task_manager',
  };
};
