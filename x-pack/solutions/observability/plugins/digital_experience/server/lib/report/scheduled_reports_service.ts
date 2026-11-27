/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { badRequest, notFound, serverUnavailable } from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  DIGITAL_EXPERIENCE_REPORT_FREQUENCIES,
  DIGITAL_EXPERIENCE_REPORT_WEEKDAYS,
  DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
  type DigitalExperienceReportFrequency,
  type DigitalExperienceReportWeekday,
  type DigitalExperienceScorecardReportTemplateValues,
} from '@kbn/workflows/managed';
import type {
  ManagedWorkflowInstanceState,
  PluginScopedManagedWorkflowsApi,
} from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type {
  DeleteScheduledReportResponse,
  EmailConnectorOption,
  EmailConnectorsResponse,
  ReportType,
  RunScheduledReportResponse,
  ScheduledReport,
  ScheduledReportInput,
  ScheduledReportLastRun,
  ScheduledReportSchedule,
  ScheduledReportsListResponse,
  SetScheduledReportEnabledResponse,
} from '../../../common/types/scheduled_reports';
import { DEFAULT_REPORT_LOOKBACK_DAYS } from '../../../common/types/scheduled_reports';
import { describeError } from '../helpers/errors';

const EMAIL_CONNECTOR_TYPE_ID = '.email';
const VALID_FREQUENCIES = new Set<string>(DIGITAL_EXPERIENCE_REPORT_FREQUENCIES);
const VALID_WEEKDAYS = new Set<string>(DIGITAL_EXPERIENCE_REPORT_WEEKDAYS);

const REPORT_TYPE_WORKFLOW_IDS = {
  scorecard: DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
} as const satisfies Record<ReportType, string>;

type ReportWorkflowDefinitionId = (typeof REPORT_TYPE_WORKFLOW_IDS)[ReportType];

const WORKFLOW_ID_TO_REPORT_TYPE: ReadonlyMap<string, ReportType> = new Map(
  (Object.entries(REPORT_TYPE_WORKFLOW_IDS) as Array<[ReportType, ReportWorkflowDefinitionId]>).map(
    ([reportType, definitionId]) => [definitionId, reportType]
  )
);

export interface ScheduledReportsWorkflowsServices {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  workflowsManagement: WorkflowsManagementApi | undefined;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi | undefined>;
}

interface ActiveWorkflowsServices {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  workflowsManagement: WorkflowsManagementApi;
  managedWorkflows: PluginScopedManagedWorkflowsApi;
}

const getSpaceId = (request: KibanaRequest): string => request.spaceId ?? 'default';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseTemplateValues = (
  raw: ManagedWorkflowInstanceState['templateValues']
): DigitalExperienceScorecardReportTemplateValues | undefined => {
  if (!isRecord(raw)) {
    return undefined;
  }
  const {
    name,
    serviceName,
    environment,
    lookbackDays,
    frequency,
    weekday,
    monthday,
    hour,
    minute,
    timeZone,
    connectorId,
    recipients,
  } = raw;

  if (
    typeof name !== 'string' ||
    typeof serviceName !== 'string' ||
    typeof frequency !== 'string' ||
    !VALID_FREQUENCIES.has(frequency) ||
    typeof hour !== 'number' ||
    typeof minute !== 'number' ||
    typeof timeZone !== 'string' ||
    typeof connectorId !== 'string' ||
    !Array.isArray(recipients)
  ) {
    return undefined;
  }

  return {
    name,
    serviceName,
    ...(typeof environment === 'string' && environment.length > 0 ? { environment } : {}),
    lookbackDays: typeof lookbackDays === 'number' ? lookbackDays : DEFAULT_REPORT_LOOKBACK_DAYS,
    frequency: frequency as DigitalExperienceReportFrequency,
    ...(typeof weekday === 'string' && VALID_WEEKDAYS.has(weekday)
      ? { weekday: weekday as DigitalExperienceReportWeekday }
      : {}),
    ...(typeof monthday === 'number' ? { monthday } : {}),
    hour,
    minute,
    timeZone,
    connectorId,
    recipients: recipients.filter((entry): entry is string => typeof entry === 'string'),
  };
};

const toSchedule = (
  values: DigitalExperienceScorecardReportTemplateValues
): ScheduledReportSchedule => ({
  frequency: values.frequency,
  ...(values.frequency === 'WEEKLY' ? { weekday: values.weekday ?? 'MO' } : {}),
  ...(values.frequency === 'MONTHLY' ? { monthday: values.monthday ?? 1 } : {}),
  hour: values.hour,
  minute: values.minute,
  timeZone: values.timeZone,
});

const toTemplateValues = (
  serviceName: string,
  input: ScheduledReportInput
): DigitalExperienceScorecardReportTemplateValues => {
  const environment = input.environment?.trim();
  const recipients = Array.from(new Set(input.recipients.map((entry) => entry.trim())));
  const { schedule } = input;
  return {
    name: input.name.trim(),
    serviceName,
    ...(environment ? { environment } : {}),
    lookbackDays: input.lookbackDays,
    frequency: schedule.frequency,
    ...(schedule.frequency === 'WEEKLY' ? { weekday: schedule.weekday ?? 'MO' } : {}),
    ...(schedule.frequency === 'MONTHLY' ? { monthday: schedule.monthday ?? 1 } : {}),
    hour: schedule.hour,
    minute: schedule.minute,
    timeZone: schedule.timeZone,
    connectorId: input.connectorId,
    recipients,
  };
};

const toScheduledReport = ({
  id,
  reportType,
  values,
  enabled,
  connectorName,
  lastRun,
}: {
  id: string;
  reportType: ReportType;
  values: DigitalExperienceScorecardReportTemplateValues;
  enabled: boolean;
  connectorName?: string;
  lastRun?: ScheduledReportLastRun;
}): ScheduledReport => ({
  id,
  reportType,
  serviceName: values.serviceName,
  name: values.name,
  ...(values.environment ? { environment: values.environment } : {}),
  lookbackDays: values.lookbackDays,
  schedule: toSchedule(values),
  connectorId: values.connectorId,
  ...(connectorName ? { connectorName } : {}),
  recipients: values.recipients,
  enabled,
  ...(lastRun ? { lastRun } : {}),
});

const resolveActiveServices = async (
  services: ScheduledReportsWorkflowsServices,
  request: KibanaRequest
): Promise<ActiveWorkflowsServices | undefined> => {
  const { workflowsExtensions, workflowsManagement, getManagedWorkflowsClient } = services;
  if (!workflowsExtensions || !workflowsManagement) {
    return undefined;
  }
  const client = await workflowsExtensions.getClient(request);
  if (!client.isWorkflowsAvailable) {
    return undefined;
  }
  const managedWorkflows = await getManagedWorkflowsClient();
  if (!managedWorkflows) {
    return undefined;
  }
  return { workflowsExtensions, workflowsManagement, managedWorkflows };
};

const requireActiveServices = async (
  services: ScheduledReportsWorkflowsServices,
  request: KibanaRequest
): Promise<ActiveWorkflowsServices> => {
  const active = await resolveActiveServices(services, request);
  if (!active) {
    throw serverUnavailable(
      i18n.translate('xpack.digitalExperience.api.scheduledReportsUnavailable', {
        defaultMessage: 'Scheduled reports require Workflows to be enabled and licensed.',
      })
    );
  }
  return active;
};

const fetchEmailConnectors = async (
  workflowsManagement: WorkflowsManagementApi,
  spaceId: string,
  request: KibanaRequest
): Promise<EmailConnectorOption[]> => {
  const { connectorTypes } = await workflowsManagement.getAvailableConnectors(spaceId, request);
  const instances = connectorTypes[EMAIL_CONNECTOR_TYPE_ID]?.instances ?? [];
  return instances.map(({ id, name, isPreconfigured, isDeprecated }) => ({
    id,
    name,
    ...(isPreconfigured !== undefined ? { isPreconfigured } : {}),
    ...(isDeprecated !== undefined ? { isDeprecated } : {}),
  }));
};

const assertValidEmailConnector = async (
  workflowsManagement: WorkflowsManagementApi,
  spaceId: string,
  request: KibanaRequest,
  connectorId: string
): Promise<EmailConnectorOption> => {
  const connectors = await fetchEmailConnectors(workflowsManagement, spaceId, request);
  const matched = connectors.find((connector) => connector.id === connectorId);
  if (!matched) {
    throw badRequest(
      i18n.translate('xpack.digitalExperience.api.scheduledReportConnectorNotFound', {
        defaultMessage: 'The selected email connector was not found in this space.',
      })
    );
  }
  return matched;
};

interface OwnedSchedule {
  definitionId: ReportWorkflowDefinitionId;
  reportType: ReportType;
  values: DigitalExperienceScorecardReportTemplateValues;
}

const assertOwnedSchedule = async (
  managedWorkflows: PluginScopedManagedWorkflowsApi,
  scheduleId: string,
  spaceId: string,
  serviceName: string
): Promise<OwnedSchedule> => {
  const state = await managedWorkflows.getInstalledWorkflowState(scheduleId, spaceId);
  if (!state || state.spaceId !== spaceId || !state.definitionId) {
    throw notFound();
  }
  const reportType = WORKFLOW_ID_TO_REPORT_TYPE.get(state.definitionId);
  if (!reportType) {
    throw notFound();
  }
  const values = parseTemplateValues(state.templateValues);
  if (!values || values.serviceName !== serviceName) {
    throw notFound();
  }
  return { definitionId: REPORT_TYPE_WORKFLOW_IDS[reportType], reportType, values };
};

const fetchLatestExecution = async (
  workflowsManagement: WorkflowsManagementApi,
  workflowId: string,
  spaceId: string,
  request: KibanaRequest,
  logger: Logger
): Promise<ScheduledReportLastRun | undefined> => {
  try {
    const executions = await workflowsManagement.getWorkflowExecutions(
      {
        workflowId,
        page: 1,
        size: 1,
        sortField: 'createdAt',
        sortOrder: 'desc',
        request,
      },
      spaceId
    );
    const latest = executions.results[0];
    if (!latest) {
      return undefined;
    }
    return {
      status: latest.status,
      startedAt: latest.startedAt,
      ...(latest.error?.message ? { error: latest.error.message } : {}),
    };
  } catch (error) {
    logger.debug(
      `Could not load executions for scheduled report ${workflowId}: ${describeError(error)}`
    );
    return undefined;
  }
};

/** Lists email connectors in the caller's space when Workflows is available. */
export const listEmailConnectors = async ({
  services,
  request,
}: {
  services: ScheduledReportsWorkflowsServices;
  request: KibanaRequest;
}): Promise<EmailConnectorsResponse> => {
  const active = await resolveActiveServices(services, request);
  if (!active) {
    return { available: false, emailConnectors: [] };
  }
  const spaceId = getSpaceId(request);
  const emailConnectors = await fetchEmailConnectors(active.workflowsManagement, spaceId, request);
  return { available: true, emailConnectors };
};

/** Lists the scheduled scorecard reports of one application in the caller's space. */
export const listScheduledReports = async ({
  services,
  request,
  serviceName,
  logger,
}: {
  services: ScheduledReportsWorkflowsServices;
  request: KibanaRequest;
  serviceName: string;
  logger: Logger;
}): Promise<ScheduledReportsListResponse> => {
  const active = await resolveActiveServices(services, request);
  if (!active) {
    return { available: false, reports: [] };
  }
  const spaceId = getSpaceId(request);
  const installedStates = await active.managedWorkflows.listInstalledWorkflowStates();

  const matchingStates: Array<{
    workflowId: string;
    reportType: ReportType;
    values: DigitalExperienceScorecardReportTemplateValues;
  }> = [];
  for (const state of installedStates) {
    if (state.spaceId !== spaceId || !state.definitionId) {
      continue;
    }
    const reportType = WORKFLOW_ID_TO_REPORT_TYPE.get(state.definitionId);
    if (!reportType) {
      continue;
    }
    const values = parseTemplateValues(state.templateValues);
    if (values?.serviceName === serviceName) {
      matchingStates.push({ workflowId: state.workflowId, reportType, values });
    }
  }

  if (matchingStates.length === 0) {
    return { available: true, reports: [] };
  }

  const workflowIds = matchingStates.map(({ workflowId }) => workflowId);
  const [workflows, connectorNames, lastRuns] = await Promise.all([
    active.workflowsManagement.getWorkflowsByIds(workflowIds, spaceId, request),
    fetchEmailConnectors(active.workflowsManagement, spaceId, request)
      .then((connectors) => new Map(connectors.map(({ id, name }) => [id, name])))
      .catch((error) => {
        logger.debug(`Could not resolve email connector names: ${describeError(error)}`);
        return new Map<string, string>();
      }),
    Promise.all(
      workflowIds.map(async (workflowId) => [
        workflowId,
        await fetchLatestExecution(
          active.workflowsManagement,
          workflowId,
          spaceId,
          request,
          logger
        ),
      ])
    ).then((entries) => new Map(entries as Array<[string, ScheduledReportLastRun | undefined]>)),
  ]);

  const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

  const reports = matchingStates
    .flatMap(({ workflowId, reportType, values }) => {
      const workflow = workflowsById.get(workflowId);
      if (!workflow) {
        return [];
      }
      return [
        {
          lastUpdatedAt: workflow.lastUpdatedAt ?? '',
          report: toScheduledReport({
            id: workflowId,
            reportType,
            values,
            enabled: workflow.enabled,
            connectorName: connectorNames.get(values.connectorId),
            lastRun: lastRuns.get(workflowId),
          }),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.lastUpdatedAt.localeCompare(a.lastUpdatedAt) || a.report.name.localeCompare(b.report.name)
    )
    .map(({ report }) => report);

  return { available: true, reports };
};

/** Creates a managed workflow for a scheduled scorecard report and syncs its schedule. */
export const createScheduledReport = async ({
  services,
  request,
  serviceName,
  input,
}: {
  services: ScheduledReportsWorkflowsServices;
  request: KibanaRequest;
  serviceName: string;
  input: ScheduledReportInput;
}): Promise<ScheduledReport> => {
  const active = await requireActiveServices(services, request);
  const spaceId = getSpaceId(request);
  const connector = await assertValidEmailConnector(
    active.workflowsManagement,
    spaceId,
    request,
    input.connectorId
  );

  const definitionId = REPORT_TYPE_WORKFLOW_IDS[input.reportType];
  const values = toTemplateValues(serviceName, input);
  const workflowId = `${definitionId}-${randomUUID()}`;

  await active.managedWorkflows.install(definitionId, {
    spaceId,
    workflowId,
    values,
  });

  // `install` is best-effort during ES readiness gating; confirm the doc exists before scheduling.
  const installed = await active.managedWorkflows.getInstalledWorkflowState(workflowId, spaceId);
  if (!installed) {
    throw serverUnavailable(
      i18n.translate('xpack.digitalExperience.api.scheduledReportPersistFailed', {
        defaultMessage: 'Workflows is temporarily unavailable. Try again shortly.',
      })
    );
  }

  // `install` writes the document only; `updateWorkflow` applies enablement and schedules the trigger.
  await active.workflowsManagement.updateWorkflow(
    workflowId,
    { enabled: input.enabled },
    spaceId,
    request
  );

  return toScheduledReport({
    id: workflowId,
    reportType: input.reportType,
    values,
    enabled: input.enabled,
    connectorName: connector.name,
  });
};

/** Updates an existing scheduled report and resyncs its Task Manager trigger. */
export const updateScheduledReport = async ({
  services,
  request,
  serviceName,
  scheduleId,
  input,
}: {
  services: ScheduledReportsWorkflowsServices;
  request: KibanaRequest;
  serviceName: string;
  scheduleId: string;
  input: ScheduledReportInput;
}): Promise<ScheduledReport> => {
  const active = await requireActiveServices(services, request);
  const spaceId = getSpaceId(request);
  const owned = await assertOwnedSchedule(
    active.managedWorkflows,
    scheduleId,
    spaceId,
    serviceName
  );
  if (input.reportType !== owned.reportType) {
    throw badRequest(
      i18n.translate('xpack.digitalExperience.api.scheduledReportTypeImmutable', {
        defaultMessage: 'Cannot change the report type of an existing scheduled report.',
      })
    );
  }
  const connector = await assertValidEmailConnector(
    active.workflowsManagement,
    spaceId,
    request,
    input.connectorId
  );

  const values = toTemplateValues(serviceName, input);
  await active.managedWorkflows.install(owned.definitionId, {
    spaceId,
    workflowId: scheduleId,
    values,
  });

  await active.workflowsManagement.updateWorkflow(
    scheduleId,
    { enabled: input.enabled },
    spaceId,
    request
  );

  return toScheduledReport({
    id: scheduleId,
    reportType: owned.reportType,
    values,
    enabled: input.enabled,
    connectorName: connector.name,
  });
};

/** Enables or disables a scheduled scorecard report. */
export const setScheduledReportEnabled = async ({
  services,
  request,
  serviceName,
  scheduleId,
  enabled,
}: {
  services: ScheduledReportsWorkflowsServices;
  request: KibanaRequest;
  serviceName: string;
  scheduleId: string;
  enabled: boolean;
}): Promise<SetScheduledReportEnabledResponse> => {
  const active = await requireActiveServices(services, request);
  const spaceId = getSpaceId(request);
  await assertOwnedSchedule(active.managedWorkflows, scheduleId, spaceId, serviceName);
  await active.workflowsManagement.updateWorkflow(scheduleId, { enabled }, spaceId, request);
  return { id: scheduleId, enabled };
};

/** Runs a scheduled scorecard report immediately under the caller's request. */
export const runScheduledReport = async ({
  services,
  request,
  serviceName,
  scheduleId,
}: {
  services: ScheduledReportsWorkflowsServices;
  request: KibanaRequest;
  serviceName: string;
  scheduleId: string;
}): Promise<RunScheduledReportResponse> => {
  const active = await requireActiveServices(services, request);
  const spaceId = getSpaceId(request);
  const owned = await assertOwnedSchedule(
    active.managedWorkflows,
    scheduleId,
    spaceId,
    serviceName
  );

  const workflow = await active.workflowsManagement.getWorkflow(scheduleId, spaceId, request);
  if (!workflow) {
    throw notFound();
  }
  if (!workflow.enabled) {
    throw badRequest(
      i18n.translate('xpack.digitalExperience.api.scheduledReportDisabledRun', {
        defaultMessage: 'Enable the scheduled report before running it.',
      })
    );
  }

  const executionId = await active.managedWorkflows.execute(request, owned.definitionId, {
    spaceId,
    workflowId: scheduleId,
    triggeredBy: 'manual',
  });
  return { executionId };
};

/** Deletes a scheduled report and unschedules its Task Manager task. */
export const deleteScheduledReport = async ({
  services,
  request,
  serviceName,
  scheduleId,
}: {
  services: ScheduledReportsWorkflowsServices;
  request: KibanaRequest;
  serviceName: string;
  scheduleId: string;
}): Promise<DeleteScheduledReportResponse> => {
  const active = await requireActiveServices(services, request);
  const spaceId = getSpaceId(request);
  const owned = await assertOwnedSchedule(
    active.managedWorkflows,
    scheduleId,
    spaceId,
    serviceName
  );

  await active.managedWorkflows.uninstall(owned.definitionId, {
    spaceId,
    workflowId: scheduleId,
  });
  return { deleted: true };
};
