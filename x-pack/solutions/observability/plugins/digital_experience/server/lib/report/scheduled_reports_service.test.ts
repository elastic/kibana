/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID } from '@kbn/workflows/managed';
import type {
  ManagedWorkflowInstanceState,
  PluginScopedManagedWorkflowsApi,
} from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { ScheduledReportInput } from '../../../common/types/scheduled_reports';
import {
  createScheduledReport,
  deleteScheduledReport,
  listEmailConnectors,
  listScheduledReports,
  runScheduledReport,
  setScheduledReportEnabled,
  updateScheduledReport,
  type ScheduledReportsWorkflowsServices,
} from './scheduled_reports_service';

const makeRequest = (spaceId = 'default') => ({ spaceId } as unknown as KibanaRequest);

const makeInput = (overrides: Partial<ScheduledReportInput> = {}): ScheduledReportInput => ({
  reportType: 'scorecard',
  name: 'Weekly scorecard: shop',
  environment: 'production',
  lookbackDays: 7,
  schedule: {
    frequency: 'WEEKLY',
    weekday: 'MO',
    hour: 9,
    minute: 0,
    timeZone: 'UTC',
  },
  connectorId: 'email-1',
  recipients: ['team@example.com'],
  enabled: true,
  ...overrides,
});

const makeState = (
  workflowId: string,
  overrides: Partial<ManagedWorkflowInstanceState> = {}
): ManagedWorkflowInstanceState => ({
  workflowId,
  spaceId: 'default',
  definitionId: DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
  documentVersion: 1,
  templateValues: {
    name: 'Weekly scorecard: shop',
    serviceName: 'shop',
    environment: 'production',
    lookbackDays: 7,
    frequency: 'WEEKLY',
    weekday: 'MO',
    hour: 9,
    minute: 0,
    timeZone: 'UTC',
    connectorId: 'email-1',
    recipients: ['team@example.com'],
  },
  ...overrides,
});

const makeServices = (available = true) => {
  const managedWorkflows = {
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue('exec-1'),
    getInstalledWorkflowState: jest.fn().mockResolvedValue(null),
    listInstalledWorkflowStates: jest.fn().mockResolvedValue([]),
  };
  const workflowsManagement = {
    getAvailableConnectors: jest.fn().mockResolvedValue({
      connectorTypes: {
        '.email': {
          instances: [{ id: 'email-1', name: 'SMTP Primary', isPreconfigured: false }],
        },
      },
      totalConnectors: 1,
    }),
    getWorkflowsByIds: jest.fn().mockResolvedValue([]),
    getWorkflow: jest.fn().mockResolvedValue(null),
    updateWorkflow: jest.fn().mockResolvedValue({ id: 'wf-1', enabled: true }),
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0, page: 1, size: 1 }),
  };
  const workflowsExtensions = {
    getClient: jest.fn().mockResolvedValue({ isWorkflowsAvailable: available }),
  };
  const services: ScheduledReportsWorkflowsServices = {
    workflowsExtensions: workflowsExtensions as unknown as WorkflowsExtensionsServerPluginStart,
    workflowsManagement: workflowsManagement as unknown as WorkflowsManagementApi,
    getManagedWorkflowsClient: jest
      .fn()
      .mockResolvedValue(managedWorkflows as unknown as PluginScopedManagedWorkflowsApi),
  };
  return { services, managedWorkflows, workflowsManagement, workflowsExtensions };
};

describe('scheduled_reports_service', () => {
  const logger = loggingSystemMock.create().get();

  describe('listEmailConnectors', () => {
    it('returns unavailable when Workflows is disabled or unlicensed', async () => {
      const { services } = makeServices(false);
      await expect(listEmailConnectors({ services, request: makeRequest() })).resolves.toEqual({
        available: false,
        emailConnectors: [],
      });
    });

    it('returns email connector instances in the caller space', async () => {
      const { services, workflowsManagement } = makeServices(true);
      const request = makeRequest('marketing');
      await expect(listEmailConnectors({ services, request })).resolves.toEqual({
        available: true,
        emailConnectors: [{ id: 'email-1', name: 'SMTP Primary', isPreconfigured: false }],
      });
      expect(workflowsManagement.getAvailableConnectors).toHaveBeenCalledWith('marketing', request);
    });
  });

  describe('listScheduledReports', () => {
    it('returns unavailable when Workflows is missing', async () => {
      const services: ScheduledReportsWorkflowsServices = {
        workflowsExtensions: undefined,
        workflowsManagement: undefined,
        getManagedWorkflowsClient: jest.fn(),
      };
      await expect(
        listScheduledReports({ services, request: makeRequest(), serviceName: 'shop', logger })
      ).resolves.toEqual({ available: false, reports: [] });
    });

    it('filters to the caller space and application and enriches status, connector, and last run', async () => {
      const { services, managedWorkflows, workflowsManagement } = makeServices(true);
      const id1 = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-1`;
      const id2 = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-2`;
      managedWorkflows.listInstalledWorkflowStates.mockResolvedValue([
        makeState(id1),
        makeState(id2, { spaceId: 'other-space' }),
        makeState(`${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-3`, {
          templateValues: { ...makeState(id1).templateValues, serviceName: 'other-app' },
        }),
      ]);
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([
        { id: id1, enabled: true, lastUpdatedAt: '2026-11-20T09:00:00.000Z' },
      ]);
      workflowsManagement.getWorkflowExecutions.mockResolvedValue({
        results: [{ status: 'completed', startedAt: '2026-11-23T09:00:00.000Z', error: null }],
        total: 1,
        page: 1,
        size: 1,
      });

      const result = await listScheduledReports({
        services,
        request: makeRequest('default'),
        serviceName: 'shop',
        logger,
      });

      expect(result).toEqual({
        available: true,
        reports: [
          {
            id: id1,
            reportType: 'scorecard',
            serviceName: 'shop',
            name: 'Weekly scorecard: shop',
            environment: 'production',
            lookbackDays: 7,
            schedule: {
              frequency: 'WEEKLY',
              weekday: 'MO',
              hour: 9,
              minute: 0,
              timeZone: 'UTC',
            },
            connectorId: 'email-1',
            connectorName: 'SMTP Primary',
            recipients: ['team@example.com'],
            enabled: true,
            lastRun: { status: 'completed', startedAt: '2026-11-23T09:00:00.000Z' },
          },
        ],
      });
    });

    it('still lists reports when execution history lookup fails', async () => {
      const { services, managedWorkflows, workflowsManagement } = makeServices(true);
      const id = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-1`;
      managedWorkflows.listInstalledWorkflowStates.mockResolvedValue([makeState(id)]);
      workflowsManagement.getWorkflowsByIds.mockResolvedValue([
        { id, enabled: false, lastUpdatedAt: '2026-11-20T09:00:00.000Z' },
      ]);
      workflowsManagement.getWorkflowExecutions.mockRejectedValue(new Error('index_not_found'));

      const result = await listScheduledReports({
        services,
        request: makeRequest(),
        serviceName: 'shop',
        logger,
      });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].lastRun).toBeUndefined();
    });
  });

  describe('createScheduledReport', () => {
    it('installs a space-scoped managed workflow and syncs enablement', async () => {
      const { services, managedWorkflows, workflowsManagement } = makeServices(true);
      managedWorkflows.getInstalledWorkflowState.mockImplementation(async (workflowId: string) =>
        makeState(workflowId)
      );
      const request = makeRequest('ops');

      const created = await createScheduledReport({
        services,
        request,
        serviceName: 'shop',
        input: makeInput({ recipients: ['a@example.com', 'a@example.com', ' b@example.com '] }),
      });

      expect(created.id.startsWith(`${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-`)).toBe(
        true
      );
      expect(created.reportType).toBe('scorecard');
      expect(created.connectorName).toBe('SMTP Primary');
      expect(created.recipients).toEqual(['a@example.com', 'b@example.com']);
      expect(managedWorkflows.install).toHaveBeenCalledWith(
        DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
        expect.objectContaining({
          spaceId: 'ops',
          workflowId: created.id,
          values: expect.objectContaining({
            serviceName: 'shop',
            connectorId: 'email-1',
            recipients: ['a@example.com', 'b@example.com'],
          }),
        })
      );
      expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
        created.id,
        { enabled: true },
        'ops',
        request
      );
    });

    it('rejects unknown email connectors with 400', async () => {
      const { services } = makeServices(true);
      await expect(
        createScheduledReport({
          services,
          request: makeRequest(),
          serviceName: 'shop',
          input: makeInput({ connectorId: 'missing' }),
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
    });

    it('returns 503 when install does not persist the workflow', async () => {
      const { services, managedWorkflows } = makeServices(true);
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(null);

      await expect(
        createScheduledReport({
          services,
          request: makeRequest(),
          serviceName: 'shop',
          input: makeInput(),
        })
      ).rejects.toMatchObject({ output: { statusCode: 503 } });
    });
  });

  describe('updateScheduledReport', () => {
    it('updates an owned schedule and resyncs Task Manager', async () => {
      const { services, managedWorkflows, workflowsManagement } = makeServices(true);
      const scheduleId = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-abc`;
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(makeState(scheduleId));
      const request = makeRequest();

      const updated = await updateScheduledReport({
        services,
        request,
        serviceName: 'shop',
        scheduleId,
        input: makeInput({
          name: 'Daily shop scorecard',
          schedule: { frequency: 'DAILY', hour: 8, minute: 30, timeZone: 'America/New_York' },
        }),
      });

      expect(updated.id).toBe(scheduleId);
      expect(updated.reportType).toBe('scorecard');
      expect(updated.name).toBe('Daily shop scorecard');
      expect(managedWorkflows.install).toHaveBeenCalledWith(
        DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
        expect.objectContaining({ workflowId: scheduleId, spaceId: 'default' })
      );
      expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
        scheduleId,
        { enabled: true },
        'default',
        request
      );
    });

    it('returns 404 when the schedule belongs to another application', async () => {
      const { services, managedWorkflows } = makeServices(true);
      const scheduleId = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-abc`;
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(
        makeState(scheduleId, {
          templateValues: { ...makeState(scheduleId).templateValues, serviceName: 'other' },
        })
      );

      await expect(
        updateScheduledReport({
          services,
          request: makeRequest(),
          serviceName: 'shop',
          scheduleId,
          input: makeInput(),
        })
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
    });

    it('rejects changing reportType on an existing schedule with 400', async () => {
      const { services, managedWorkflows } = makeServices(true);
      const scheduleId = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-abc`;
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(makeState(scheduleId));

      await expect(
        updateScheduledReport({
          services,
          request: makeRequest(),
          serviceName: 'shop',
          scheduleId,
          input: makeInput({
            reportType: 'other' as ScheduledReportInput['reportType'],
          }),
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
    });
  });

  describe('setScheduledReportEnabled', () => {
    it('toggles enablement on an owned schedule', async () => {
      const { services, managedWorkflows, workflowsManagement } = makeServices(true);
      const scheduleId = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-abc`;
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(makeState(scheduleId));
      const request = makeRequest();

      await expect(
        setScheduledReportEnabled({
          services,
          request,
          serviceName: 'shop',
          scheduleId,
          enabled: false,
        })
      ).resolves.toEqual({ id: scheduleId, enabled: false });
      expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
        scheduleId,
        { enabled: false },
        'default',
        request
      );
    });
  });

  describe('runScheduledReport', () => {
    it('executes an enabled owned schedule manually', async () => {
      const { services, managedWorkflows, workflowsManagement } = makeServices(true);
      const scheduleId = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-abc`;
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(makeState(scheduleId));
      workflowsManagement.getWorkflow.mockResolvedValue({ id: scheduleId, enabled: true });
      const request = makeRequest();

      await expect(
        runScheduledReport({ services, request, serviceName: 'shop', scheduleId })
      ).resolves.toEqual({ executionId: 'exec-1' });
      expect(managedWorkflows.execute).toHaveBeenCalledWith(
        request,
        DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
        { spaceId: 'default', workflowId: scheduleId, triggeredBy: 'manual' }
      );
    });

    it('rejects running a disabled schedule with 400', async () => {
      const { services, managedWorkflows, workflowsManagement } = makeServices(true);
      const scheduleId = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-abc`;
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(makeState(scheduleId));
      workflowsManagement.getWorkflow.mockResolvedValue({ id: scheduleId, enabled: false });

      await expect(
        runScheduledReport({ services, request: makeRequest(), serviceName: 'shop', scheduleId })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(managedWorkflows.execute).not.toHaveBeenCalled();
    });
  });

  describe('deleteScheduledReport', () => {
    it('uninstalls an owned schedule', async () => {
      const { services, managedWorkflows } = makeServices(true);
      const scheduleId = `${DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID}-abc`;
      managedWorkflows.getInstalledWorkflowState.mockResolvedValue(makeState(scheduleId));

      await expect(
        deleteScheduledReport({
          services,
          request: makeRequest(),
          serviceName: 'shop',
          scheduleId,
        })
      ).resolves.toEqual({ deleted: true });
      expect(managedWorkflows.uninstall).toHaveBeenCalledWith(
        DIGITAL_EXPERIENCE_SCORECARD_REPORT_WORKFLOW_ID,
        { spaceId: 'default', workflowId: scheduleId }
      );
    });
  });
});
