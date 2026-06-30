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

const WORKFLOW_ACTOR = 'investigation workflow';
const USER_ACTOR = 'investigation user';
const UPDATER_ACTOR = 'observability investigation updater';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeWorkflowHooks = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
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
      metadata: value,
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
    actor: WORKFLOW_ACTOR,
    source: 'workflow',
  });
  const fallbackEntry: ObservabilityInvestigationTimelineEntry = {
    at: now,
    actor: WORKFLOW_ACTOR,
    source: 'workflow',
    summary: 'Investigation workflow completed',
    metadata: {
      ...(workflowExecutionId ? { workflow_execution_id: workflowExecutionId } : {}),
      ...(workflowId ? { workflow_id: workflowId } : {}),
    },
  };
  const normalizedTimeline = timelineEntries.length > 0 ? timelineEntries : [fallbackEntry];
  const nextCurrentState =
    currentState ?? report ?? normalizedTimeline[normalizedTimeline.length - 1].summary;

  return {
    status: status ?? 'complete',
    severity: severity ?? 'medium',
    current_state: nextCurrentState,
    timeline: normalizedTimeline,
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
  const incidentTimelineEntry: ObservabilityInvestigationTimelineEntry = {
    at: now,
    actor: USER_ACTOR,
    source: 'agent_builder',
    summary: `Incident conversation created from investigation ${investigation.id}`,
    metadata: {
      investigation_conversation_id: investigation.id,
    },
  };

  return appendTimelineEntries({
    customFields: {
      ...investigationFields,
      status: 'open',
      investigation_conversation_id: investigation.id,
      related_investigations: [investigation.id],
      ...(investigationFields.outcome
        ? { investigation_outcome: investigationFields.outcome }
        : {}),
    },
    entries: [incidentTimelineEntry],
    now,
  });
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
  return appendTimelineEntries({
    customFields: {
      ...customFields,
      incident_conversation_id: incidentConversationId,
    },
    entries: [
      {
        at: now,
        actor: USER_ACTOR,
        source: 'agent_builder',
        summary: `Linked incident conversation ${incidentConversationId}`,
        metadata: {
          incident_conversation_id: incidentConversationId,
        },
      },
    ],
    now,
  });
};

export const buildManualRefreshFields = ({
  customFields,
  now,
  currentState,
  outcome,
  status,
  timeline,
  workflowHooks,
  metadata,
}: BuildManualRefreshFieldsOptions): Record<string, unknown> => {
  const timelineEntries = normalizeTimelineInput({
    value: timeline,
    now,
    actor: USER_ACTOR,
    source: 'manual_refresh',
  });
  const nextCurrentState =
    currentState ?? outcome ?? getString(customFields.current_state) ?? 'State refreshed';

  return appendTimelineEntries({
    customFields: {
      ...customFields,
      current_state: nextCurrentState,
      last_refreshed_at: now,
      last_state_update_source: 'manual_refresh',
      ...(status ? { status } : {}),
      ...(outcome ? { outcome } : {}),
      ...(workflowHooks ? { workflow_hooks: normalizeWorkflowHooks(workflowHooks) } : {}),
      ...(metadata ? { refresh_metadata: metadata } : {}),
    },
    entries:
      timelineEntries.length > 0
        ? timelineEntries
        : [
            {
              at: now,
              actor: USER_ACTOR,
              source: 'manual_refresh',
              summary: nextCurrentState,
            },
          ],
    now,
  });
};

export const buildPeriodicRefreshFields = ({
  conversationId,
  title,
  customFields,
  now,
}: {
  conversationId: string;
  title?: string;
  customFields: Record<string, unknown>;
  now: string;
}): Record<string, unknown> => {
  const currentState = getString(customFields.current_state) ?? 'Investigation conversation active';
  return appendTimelineEntries({
    customFields: {
      ...customFields,
      current_state: currentState,
      last_refreshed_at: now,
      last_state_update_source: 'task_manager',
    },
    entries: [
      {
        at: now,
        actor: UPDATER_ACTOR,
        source: 'task_manager',
        summary: `Periodic state refresh: ${currentState}`,
        metadata: {
          conversation_id: conversationId,
          ...(title ? { title } : {}),
        },
      },
    ],
    now,
  });
};
