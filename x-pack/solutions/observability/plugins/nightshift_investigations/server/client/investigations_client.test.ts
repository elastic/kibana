/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import {
  createAgentNotFoundError,
  createConversationAlreadyExistsError,
  createConversationNotFoundError,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { SlackThreadSubject } from '@kbn/agentic-investigations-plugin/common';
import {
  MAX_SLACK_SEEN_EVENTS,
  INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  MAX_INVESTIGATION_RUN_FAILURE_TEXT_LENGTH,
} from '@kbn/agentic-investigations-plugin/common';
import {
  NIGHTSHIFT_DEFAULT_MODELS,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import type { StartInvestigationRequest } from '../../common';
import { freeFormContextSchema } from '../../common/schemas';
import { installAssistantAgent } from '../lib/install_assistant_agent';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import { createAutomationBudget, readAutomationUsage } from '../lib/automations/automation_budget';
import { createBudgetRepository } from '../lib/automations/automation_budget.mock';
import {
  AutomationDailyLimitReachedError,
  InvalidInvestigationContextError,
  InvestigationNotFoundError,
  InvestigationQuotaDeniedError,
  InvestigationUnavailableError,
} from './errors';
import { NightshiftInvestigationsClient } from './investigations_client';
jest.mock('../lib/install_investigation_agent', () => ({
  installInvestigationAgent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/install_assistant_agent', () => ({
  installAssistantAgent: jest.fn().mockResolvedValue(undefined),
}));

const mockNewInvestigationId = jest.fn(() => 'inv-new');
jest.mock('uuid', () => ({ ...jest.requireActual('uuid'), v4: () => mockNewInvestigationId() }));

const installInvestigationAgentMock = installInvestigationAgent as jest.MockedFunction<
  typeof installInvestigationAgent
>;
const installAssistantAgentMock = installAssistantAgent as jest.MockedFunction<
  typeof installAssistantAgent
>;

const SPACE_ID = 'test-space';

const mockManagement = {
  getWorkflowExecution: jest.fn(),
  getWorkflow: jest.fn(),
  runWorkflow: jest.fn(),
};

const mockWorkflowsManagement = {
  management: mockManagement,
} as unknown as WorkflowsServerPluginSetup;

const conversations = {
  bulkGet: jest.fn(),
  create: jest.fn(),
  patchMetadata: jest.fn(),
  addEvents: jest.fn(),
};

const mockAgentBuilder = {
  conversations: { getScopedClient: jest.fn().mockResolvedValue(conversations) },
} as unknown as AgentBuilderPluginStart;

const subjectsClient = {
  upsertSubjects: jest.fn(),
  findConversationIdsBySubjects: jest.fn(),
  listByConversationIds: jest.fn(),
  claimSubjects: jest.fn(),
};
const agenticInvestigationsClient = { findOpenBySubjects: jest.fn(), get: jest.fn() };

const mockAgenticInvestigations = {
  getSubjectsClient: jest.fn().mockReturnValue(subjectsClient),
  getInvestigationsClient: jest.fn().mockReturnValue(agenticInvestigationsClient),
} as unknown as AgenticInvestigationsPluginStart;

/** A conversation as `bulkGet` returns it. */
const makeConversation = ({
  id,
  title = 'Latency is too high',
  status,
  owner = true,
  templateId = 'investigation',
  telemetryTarget,
  workflowExecutionIds,
}: {
  id: string;
  title?: string;
  status?: 'open' | 'closed';
  owner?: boolean;
  templateId?: string;
  telemetryTarget?: string;
  workflowExecutionIds?: string[];
}) => ({
  id,
  title,
  template_id: templateId,
  agent_id: 'nightshift.investigation',
  metadata: {
    ...(telemetryTarget ? { telemetry_target: telemetryTarget } : {}),
    ...(status ? { status } : {}),
    ...(workflowExecutionIds ? { workflow_execution_ids: workflowExecutionIds } : {}),
  },
  permissions: { rename: owner, delete: owner, update_access_control: owner },
});

/** Makes `bulkGet` find these conversations, and only these. */
const withConversations = (...found: Array<ReturnType<typeof makeConversation>>) => {
  conversations.bulkGet.mockImplementation(
    async (ids: string[]) =>
      new Map(found.filter(({ id }) => ids.includes(id)).map((c) => [c.id, c]))
  );
};

const makeStoredSubject = (
  overrides: Partial<{
    conversationId: string;
    subjectType: string;
    subjectId: string;
    triggerType: string;
    createdAt: string;
    slack: Partial<SlackThreadSubject>;
  }> = {}
) => ({
  id: 'doc-1',
  spaceId: SPACE_ID,
  conversationId: 'inv-1',
  subjectType: 'alert',
  subjectId: 'alert-1',
  createdAt: '2026-08-24T12:00:00.000Z',
  ...overrides,
});

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const mockRequest = {} as KibanaRequest;
const mockAgentAvailability = { cacheMode: 'space' as const, handler: jest.fn() };
const investigationQuotaCallback = jest.fn().mockResolvedValue({ allowed: true });
const getConnectorById = jest.fn(async (connectorId: string) => ({ connectorId }));
const mockInference = {
  getConnectorById,
  getDefaultConnector: jest.fn(),
} as unknown as InferenceServerStart;
const getSetting = jest.fn().mockResolvedValue(false);
const mockSavedObjects = { getScopedClient: jest.fn().mockReturnValue({}) } as never;
const mockUiSettings = {
  asScopedToClient: jest.fn().mockReturnValue({ get: getSetting }),
} as never;

const makeClient = (
  overrides: Partial<ConstructorParameters<typeof NightshiftInvestigationsClient>[0]> = {}
) =>
  new NightshiftInvestigationsClient({
    request: mockRequest,
    workflowsManagement: mockWorkflowsManagement,
    logger: mockLogger,
    spaceIdOverride: SPACE_ID,
    agentBuilder: mockAgentBuilder,
    agenticInvestigations: mockAgenticInvestigations,
    agentAvailability: mockAgentAvailability,
    investigationQuotaCallback,
    inference: mockInference,
    savedObjects: mockSavedObjects,
    uiSettings: mockUiSettings,
    isAvailable: jest.fn().mockResolvedValue(true),
    isInfrastructureAvailable: jest.fn().mockResolvedValue(true),
    isServiceAccountExecutionEnabled: () => true,
    ...overrides,
  });

/** Investigations only start on the space's entry point bound to the Nightshift service account. */
const BOUND_WORKFLOW_ID = `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${SPACE_ID}`;

/** How an investigation run started through a space's entry point executes. */
const INVESTIGATOR_IDENTITY = {
  type: 'service_account' as const,
  // As the backend assigned it: an opaque id on Serverless.
  id: 'uiam-agent-1',
};

/** The space's entry point, bound to its agent account. */
const BOUND_DEFINITION = {
  steps: [],
  settings: { run_as: INVESTIGATOR_IDENTITY.id },
};

beforeEach(() => {
  jest.clearAllMocks();
  installInvestigationAgentMock.mockResolvedValue(undefined);
  investigationQuotaCallback.mockResolvedValue({ allowed: true });
  getSetting.mockResolvedValue(false);
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
  withConversations();
  // Like Agent Builder, a conversation created without a title carries the placeholder.
  conversations.create.mockImplementation(
    async ({
      id,
      title,
      metadata,
    }: {
      id: string;
      title?: string;
      metadata?: { workflow_execution_ids?: string[]; telemetry_target?: string };
    }) =>
      makeConversation({
        id,
        title: title ?? DEFAULT_CONVERSATION_TITLE,
        workflowExecutionIds: metadata?.workflow_execution_ids,
        telemetryTarget: metadata?.telemetry_target,
      })
  );
  conversations.patchMetadata.mockResolvedValue({ conversation: {}, changedFields: ['status'] });
  conversations.addEvents.mockResolvedValue([]);
  subjectsClient.upsertSubjects.mockResolvedValue([]);
  subjectsClient.findConversationIdsBySubjects.mockResolvedValue([]);
  subjectsClient.listByConversationIds.mockResolvedValue([]);
  subjectsClient.claimSubjects.mockResolvedValue({ claimed: true });
  agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([]);
});

describe('NightshiftInvestigationsClient.start()', () => {
  const WORKFLOW_ID = BOUND_WORKFLOW_ID;
  const mockWorkflow = {
    id: WORKFLOW_ID,
    enabled: true,
    valid: true,
    definition: BOUND_DEFINITION,
  };

  const alertContext = {
    alerts: [
      {
        id: 'alert-1',
        rule_id: 'rule-1',
        rule_name: 'Latency is too high',
        rule_type_id: 'apm.transaction_duration',
        rule_category: 'Latency threshold',
        reason: 'Latency is 2.5s for service checkout',
        status: 'active',
        start: '2026-08-24T12:00:00.000Z',
        flapping: false,
      },
    ],
  };

  it('calls runWorkflow with the correct inputs and returns investigation_id', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    const result = await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'alert', id: 'alert-1' },
      trigger_type: 'manual',
      context: alertContext,
    });

    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: WORKFLOW_ID }),
      SPACE_ID,
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'alert',
          alert_id: 'alert-1',
          trigger_type: 'manual',
        }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
    expect(result).toEqual({ investigation_id: 'inv-new' });
    expect(getConnectorById).toHaveBeenCalledWith(
      NIGHTSHIFT_DEFAULT_MODELS.investigation,
      mockRequest
    );
    expect(investigationQuotaCallback).not.toHaveBeenCalled();
  });

  it('validates and forwards a custom connector using its canonical id', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');
    getConnectorById.mockResolvedValue({ connectorId: 'canonical-model' });

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'event-1' },
      trigger_type: 'manual',
      connector_id: 'legacy-alias',
    });

    expect(getConnectorById).toHaveBeenCalledWith('legacy-alias', mockRequest);
    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      SPACE_ID,
      expect.objectContaining({ connector_id: 'canonical-model' }),
      expect.anything(),
      'nightshift-investigations'
    );
  });

  it('passes the telemetry default separately from the LLM and stores it alongside the creating run', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');
    await makeClient({
      telemetryConfig: {
        default_telemetry_target: 'c0',
        telemetry_targets: { c0: { connector_id: 'telemetry-c0' } },
      },
    }).start({ subject: { type: 'manual', id: 'question' }, trigger_type: 'manual' });
    expect(mockManagement.runWorkflow.mock.calls[0][2]).toMatchObject({ telemetry_target: 'c0' });
    expect(installInvestigationAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: SPACE_ID, availability: mockAgentAvailability })
    );
    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'nightshift.investigation',
        templateId: 'investigation',
        metadata: {
          severity: 'medium',
          telemetry_target: 'c0',
          workflow_execution_ids: ['exec-123'],
        },
      })
    );
    expect(getConnectorById).toHaveBeenCalledWith(
      NIGHTSHIFT_DEFAULT_MODELS.investigation,
      mockRequest
    );
  });

  it('rejects an unknown telemetry target before launching or claiming', async () => {
    await expect(
      makeClient().start({
        subject: { type: 'manual', id: 'question' },
        trigger_type: 'manual',
        telemetry_target: 'unknown',
      })
    ).rejects.toThrow('Unknown telemetry target');
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown custom connector before launching or claiming', async () => {
    getConnectorById.mockRejectedValue(createInferenceRequestError('not found', 404));

    await expect(
      makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'event-1' },
        trigger_type: 'manual',
        connector_id: 'missing-model',
      })
    ).rejects.toEqual(new NightshiftModelNotFoundError('missing-model'));

    expect(mockManagement.getWorkflow).not.toHaveBeenCalled();
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
  });

  it('reports a missing default model instead of generic unavailability', async () => {
    getConnectorById.mockRejectedValue(createInferenceRequestError('not found', 404));

    await expect(
      makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'event-1' },
        trigger_type: 'manual',
      })
    ).rejects.toEqual(new NightshiftModelNotFoundError(NIGHTSHIFT_DEFAULT_MODELS.investigation));
  });

  it('refuses to start while service accounts are turned off', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

    await expect(
      makeClient({ isServiceAccountExecutionEnabled: () => false }).start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'event-1' },
        trigger_type: 'manual',
      })
    ).rejects.toBeInstanceOf(InvestigationUnavailableError);
    expect(mockManagement.getWorkflow).not.toHaveBeenCalled();
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
  });

  it.each([
    ['not set up', null],
    [
      'disabled',
      { id: BOUND_WORKFLOW_ID, enabled: false, valid: true, definition: BOUND_DEFINITION },
    ],
    [
      'not bound to an account',
      {
        id: BOUND_WORKFLOW_ID,
        enabled: true,
        valid: true,
        definition: { steps: [], settings: {} },
      },
    ],
  ])('refuses to start while the space is %s', async (_, boundWorkflow) => {
    mockManagement.getWorkflow.mockResolvedValue(boundWorkflow);

    await expect(
      makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'event-1' },
        trigger_type: 'manual',
      })
    ).rejects.toThrow(/enable the Nightshift service account/);
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
  });

  it('starts manual runs on the Nightshift investigation workflow', async () => {
    const investigationWorkflow = {
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: BOUND_DEFINITION,
    };
    mockManagement.getWorkflow.mockResolvedValue(investigationWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-manual');

    const result = await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'manual', id: 'manual' },
      trigger_type: 'manual',
      message: 'Why did payment timeouts increase?',
    });

    expect(mockManagement.getWorkflow).toHaveBeenCalledWith(
      BOUND_WORKFLOW_ID,
      SPACE_ID,
      mockRequest
    );
    expect(installInvestigationAgentMock).toHaveBeenCalledWith({
      agentBuilder: mockAgentBuilder,
      spaceId: SPACE_ID,
      availability: mockAgentAvailability,
    });
    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: BOUND_WORKFLOW_ID }),
      SPACE_ID,
      expect.objectContaining({
        message: 'Why did payment timeouts increase?',
        context: expect.objectContaining({ source: 'manual', manual_id: 'manual' }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
    expect(result).toEqual({ investigation_id: 'inv-new' });
    expect(installAssistantAgentMock).not.toHaveBeenCalled();
  });

  it('installs the assistant in the investigation space when it is enabled', async () => {
    // Investigations only start through the space's bound entry point.
    mockManagement.getWorkflow.mockResolvedValue({
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: BOUND_DEFINITION,
    });
    mockManagement.runWorkflow.mockResolvedValue('exec-manual');

    await makeClient({ assistantEnabled: true }).start({
      subject: { type: 'manual', id: 'manual' },
      trigger_type: 'manual',
      message: 'Why did payment timeouts increase?',
    });

    expect(installAssistantAgentMock).toHaveBeenCalledWith({
      agentBuilder: mockAgentBuilder,
      spaceId: SPACE_ID,
      availability: mockAgentAvailability,
    });
  });

  it('starts the investigation when installing the assistant fails', async () => {
    installAssistantAgentMock.mockRejectedValueOnce(new Error('assistant install failed'));
    // Investigations only start through the space's bound entry point.
    mockManagement.getWorkflow.mockResolvedValue({
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: BOUND_DEFINITION,
    });
    mockManagement.runWorkflow.mockResolvedValue('exec-manual');

    await expect(
      makeClient({ assistantEnabled: true }).start({
        subject: { type: 'manual', id: 'manual' },
        trigger_type: 'manual',
        message: 'Why did payment timeouts increase?',
      })
    ).resolves.toEqual({ investigation_id: 'inv-new' });
  });

  it('passes a per-run timeout as an input, leaving the bound definition untouched', async () => {
    const workflow = {
      id: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: {
        steps: [],
        settings: { run_as: 'kibana/nightshift_agent', timeout: '60m', concurrency: { max: 1 } },
      },
    };
    mockManagement.getWorkflow.mockResolvedValue(workflow);
    await makeClient().start({
      subject: { type: 'manual', id: 'manual' },
      trigger_type: 'automatic',
      message: 'Review errors.',
      timeout_seconds: 20,
    });
    // A bound workflow only runs its saved definition, so the run carries the timeout as an
    // input and the entry point applies it to its investigation step.
    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      workflow,
      SPACE_ID,
      expect.objectContaining({ timeout_seconds: 20 }),
      mockRequest,
      'nightshift-investigations'
    );
    expect(workflow.definition.settings.timeout).toBe('60m');
  });

  it('starts fresh investigations for repeated automatic questions without matching an open conversation', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockNewInvestigationId.mockReturnValueOnce('inv-one').mockReturnValueOnce('inv-two');
    const client = makeClient();
    const request = {
      subject: { type: 'manual' as const, id: 'manual' },
      trigger_type: 'automatic' as const,
      message: 'Review checkout health.',
    };
    expect(await client.start(request)).toEqual({ investigation_id: 'inv-one' });
    expect(await client.start(request)).toEqual({ investigation_id: 'inv-two' });
    expect(agenticInvestigationsClient.findOpenBySubjects).not.toHaveBeenCalled();
    expect(investigationQuotaCallback).toHaveBeenCalledTimes(2);
  });

  it('labels a manual run with its prompt so it does not read as "manual" while running', async () => {
    mockManagement.getWorkflow.mockResolvedValue({
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: BOUND_DEFINITION,
    });
    mockManagement.runWorkflow.mockResolvedValue('exec-manual');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'manual', id: 'manual' },
      trigger_type: 'manual',
      message: '  Why did payment\n  timeouts increase?  ',
    });

    // The context feeds runs started without subjects; the subjects are what _ensure records.
    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      SPACE_ID,
      expect.objectContaining({
        context: expect.objectContaining({ summary: 'Why did payment timeouts increase?' }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
    const { subjects } = mockManagement.runWorkflow.mock.calls[0][2];
    expect(subjects).toEqual([
      {
        type: 'manual',
        id: 'inv-new',
        triggerType: 'manual',
        summary: 'Why did payment timeouts increase?',
      },
    ]);
  });

  it('truncates a long prompt rather than storing it whole as the headline', async () => {
    mockManagement.getWorkflow.mockResolvedValue({
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: BOUND_DEFINITION,
    });
    mockManagement.runWorkflow.mockResolvedValue('exec-manual');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'manual', id: 'manual' },
      trigger_type: 'manual',
      message: 'a'.repeat(500),
    });

    const { context } = mockManagement.runWorkflow.mock.calls[0][2] as {
      context: { summary: string };
    };
    expect(context.summary).toHaveLength(200);
    expect(context.summary.endsWith('…')).toBe(true);
  });

  it('keeps an explicit subject summary over the prompt', async () => {
    mockManagement.getWorkflow.mockResolvedValue({
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: BOUND_DEFINITION,
    });
    mockManagement.runWorkflow.mockResolvedValue('exec-manual');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'manual', id: 'manual', summary: 'Checkout latency' },
      trigger_type: 'manual',
      message: 'Why did payment timeouts increase?',
    });

    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      SPACE_ID,
      expect.objectContaining({
        context: expect.objectContaining({ summary: 'Checkout latency' }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
  });

  it('leaves a non-manual subject without a summary alone', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-sig');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'event-1' },
      trigger_type: 'manual',
      message: 'Why did payment timeouts increase?',
    });

    const { context } = mockManagement.runWorkflow.mock.calls[0][2] as {
      context: Record<string, unknown>;
    };
    expect(context).not.toHaveProperty('summary');
  });

  it('keeps significant event attribution on the common investigation workflow', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-sig');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'event-1' },
      trigger_type: 'manual',
    });

    expect(mockManagement.getWorkflow).toHaveBeenCalledWith(WORKFLOW_ID, SPACE_ID, mockRequest);
  });

  it('persists an explicit trigger_type into the workflow context', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-124');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'alert', id: 'alert-2' },
      trigger_type: 'automatic',
      context: alertContext,
    });

    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      SPACE_ID,
      expect.objectContaining({
        context: expect.objectContaining({ trigger_type: 'automatic' }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
    expect(investigationQuotaCallback).toHaveBeenCalledTimes(1);
    expect(mockManagement.getWorkflow.mock.invocationCallOrder[0]).toBeLessThan(
      investigationQuotaCallback.mock.invocationCallOrder[0]
    );
    expect(investigationQuotaCallback.mock.invocationCallOrder[0]).toBeLessThan(
      installInvestigationAgentMock.mock.invocationCallOrder[0]
    );
  });

  it('passes a caller title on as a workflow input only', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({
      title: 'Checkout latency breach',
      subject: { type: 'alert', id: 'alert-1' },
      trigger_type: 'manual',
      context: alertContext,
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.title).toBe('Checkout latency breach');
    expect(inputs.context).not.toHaveProperty('title');
  });

  it('starts without a title, which Agent Builder generates on the first round', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({
      subject: { type: 'manual', id: 'manual' },
      message: 'Why is checkout slow?',
      trigger_type: 'manual',
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs).not.toHaveProperty('title');
  });

  it.each([
    ['alert', { type: 'alert' as const, id: 'alert-1' }, alertContext],
    ['significant event', { type: 'significant_event' as const, id: 'event-1' }, undefined],
  ])(
    'denies an automatic %s investigation before installation, launch, or persistence',
    async (_label, subject, context) => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      investigationQuotaCallback.mockResolvedValue({ allowed: false });

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject,
          trigger_type: 'automatic',
          context,
        })
      ).rejects.toThrow(InvestigationQuotaDeniedError);

      expect(investigationQuotaCallback).toHaveBeenCalledTimes(1);
      expect(installInvestigationAgentMock).not.toHaveBeenCalled();
      expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
      expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    }
  );

  it('persists the subject summary into the workflow context', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'alert', id: 'alert-1', summary: 'CPU saturation on checkout-api' },
      trigger_type: 'manual',
      context: alertContext,
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.context.summary).toBe('CPU saturation on checkout-api');
  });

  it('omits the context summary when none was supplied', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'alert', id: 'alert-1' },
      trigger_type: 'manual',
      context: alertContext,
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.context).not.toHaveProperty('summary');
  });

  it('runs the workflow on the investigation id, without a concurrency key', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-456');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'se-99' },
      trigger_type: 'manual',
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.investigation_id).toBe('inv-new');
    expect(inputs).not.toHaveProperty('concurrency_key');
  });

  it('uses the caller-supplied message and source_ids when provided', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-789');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'se-1' },
      trigger_type: 'manual',
      message: 'Checkout latency breach\n\nP99 latency climbed above 2s.',
      source_ids: ['logs.checkout'],
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('Checkout latency breach\n\nP99 latency climbed above 2s.');
    expect(inputs.source_ids).toEqual(['logs.checkout']);
  });

  // Uses a significant event subject: an alert investigation cannot reach the generic fallback
  // any more, because it is rejected without the alert data the brief is composed from.
  it('falls back to a generic message and omits source_ids when none are given', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-999');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'se-1' },
      trigger_type: 'manual',
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('Investigation requested for significant_event se-1');
    expect(inputs).not.toHaveProperty('source_ids');
  });

  it('ensures the investigation agent exists in the space before running the workflow', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'alert', id: 'alert-1' },
      trigger_type: 'manual',
      context: alertContext,
    });

    expect(installInvestigationAgentMock).toHaveBeenCalledWith({
      agentBuilder: mockAgentBuilder,
      spaceId: SPACE_ID,
      availability: mockAgentAvailability,
    });
    expect(installInvestigationAgentMock.mock.invocationCallOrder[0]).toBeLessThan(
      mockManagement.runWorkflow.mock.invocationCallOrder[0]
    );
  });

  it('consumes quota for every automatic start attempt', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValueOnce('exec-123').mockResolvedValueOnce('exec-124');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'se-1' },
      trigger_type: 'automatic',
    });
    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'se-2' },
      trigger_type: 'automatic',
    });

    expect(investigationQuotaCallback).toHaveBeenCalledTimes(2);
  });

  it('does not consume again when workflow launch fails after admission', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockRejectedValueOnce(new Error('Workflow launch failed'));

    await expect(
      makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'se-1' },
        trigger_type: 'automatic',
      })
    ).rejects.toThrow('Workflow launch failed');

    expect(investigationQuotaCallback).toHaveBeenCalledTimes(1);
  });

  it('does not consume again when agent installation fails after admission', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    installInvestigationAgentMock.mockRejectedValueOnce(new Error('Agent installation failed'));

    await expect(
      makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'se-1' },
        trigger_type: 'automatic',
      })
    ).rejects.toThrow('Agent installation failed');

    expect(investigationQuotaCallback).toHaveBeenCalledTimes(1);
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
  });

  it('throws InvestigationUnavailableError when the workflow is not installed', async () => {
    mockManagement.getWorkflow.mockResolvedValue(null);

    await expect(
      makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'se-1' },
        trigger_type: 'automatic',
      })
    ).rejects.toThrow(InvestigationUnavailableError);
    expect(investigationQuotaCallback).not.toHaveBeenCalled();
    expect(installInvestigationAgentMock).not.toHaveBeenCalled();
  });

  it('throws InvestigationUnavailableError when agentBuilder is not available', async () => {
    const client = new NightshiftInvestigationsClient({
      request: mockRequest,
      workflowsManagement: mockWorkflowsManagement,
      logger: mockLogger,
      spaceIdOverride: SPACE_ID,
      agentAvailability: mockAgentAvailability,
      isAvailable: jest.fn().mockResolvedValue(true),
      isInfrastructureAvailable: jest.fn().mockResolvedValue(true),
    });

    await expect(
      client.start({
        title: 'Latency is too high',
        subject: { type: 'alert', id: 'alert-1' },
        trigger_type: 'automatic',
      })
    ).rejects.toThrow(InvestigationUnavailableError);
    expect(investigationQuotaCallback).not.toHaveBeenCalled();
  });

  it('throws InvestigationUnavailableError when a start requirement is unavailable', async () => {
    await expect(
      makeClient({
        isInfrastructureAvailable: jest.fn().mockResolvedValue(false),
      }).start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'se-1' },
        trigger_type: 'automatic',
      })
    ).rejects.toThrow(InvestigationUnavailableError);
    expect(investigationQuotaCallback).not.toHaveBeenCalled();
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
  });

  // The route schema also enforces this, but the workflow step definition and the plugin start
  // contract reach start() directly, and the step types its context as a plain record.
  describe('alert context validation', () => {
    it.each([
      ['no context at all', undefined],
      ['a context with no alerts key', { source: 'alert' }],
      ['an empty alerts array', { alerts: [] }],
      ['an alert missing required fields', { alerts: [{ id: 'alert-1' }] }],
      ['an alert whose evaluation is the wrong shape', { alerts: [{ evaluation: { value: {} } }] }],
    ])('rejects an alert investigation with %s', async (_label, context) => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'alert', id: 'alert-1' },
          trigger_type: 'manual',
          context,
        })
      ).rejects.toThrow(InvalidInvestigationContextError);
      expect(investigationQuotaCallback).not.toHaveBeenCalled();
      expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    });

    // Without this, `event_uuid` reaches the workflow's attach steps and files an alert's findings
    // against a significant event.
    it.each([['event_uuid'], ['source_ids'], ['source']])(
      'rejects an alert investigation whose context also carries %s',
      async (key) => {
        mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

        await expect(
          makeClient().start({
            title: 'Latency is too high',
            subject: { type: 'alert', id: 'alert-1' },
            trigger_type: 'manual',
            context: { ...alertContext, [key]: 'whatever' },
          })
        ).rejects.toThrow(InvalidInvestigationContextError);
        expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
      }
    );

    it('names the offending keys and fields so the caller can see what was rejected', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'alert', id: 'alert-1' },
          trigger_type: 'manual',
          context: { ...alertContext, event_uuid: 'se-1', severity: 'high' },
        })
      ).rejects.toThrow(/event_uuid[\s\S]*severity/);
    });

    it('accepts a mixed array of classic and v2 snapshots and records both as subjects', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-123');
      const v2Snapshot = {
        alert_version: 'v2',
        id: 'episode-1',
        rule_id: 'v2-rule-1',
        group_hash: 'hash-1',
        status: 'active',
        start: '2026-08-24T12:00:00.000Z',
        data: { 'host.name': 'h1' },
      };

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'alert', id: 'alert-1' },
          trigger_type: 'manual',
          context: { alerts: [alertContext.alerts[0], v2Snapshot] },
        })
      ).resolves.toEqual({ investigation_id: 'inv-new' });
      expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        SPACE_ID,
        expect.objectContaining({
          subjects: [
            expect.objectContaining({ id: 'alert-1' }),
            expect.objectContaining({ id: 'episode-1', snapshot: v2Snapshot }),
          ],
        }),
        expect.anything(),
        'nightshift-investigations'
      );
    });

    it('rejects a v2 snapshot that lacks its required fields', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'alert', id: 'episode-1' },
          trigger_type: 'manual',
          context: { alerts: [{ alert_version: 'v2', id: 'episode-1' }] },
        })
      ).rejects.toThrow(InvalidInvestigationContextError);
    });

    it('reports which snapshot field was wrong rather than a bare rejection', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'alert', id: 'alert-1' },
          trigger_type: 'manual',
          context: { alerts: [{ ...alertContext.alerts[0], flapping: 'nope' }] },
        })
      ).rejects.toThrow(/flapping/);
    });

    // The workflow interpolates context.event_uuid into an internal request path, so a value that
    // is not id-shaped could point the attach steps at a different endpoint. Everything else in a
    // significant-event context stays open, because that payload belongs to another plugin.
    it.each([
      ['a path separator', 'events/../../other'],
      ['a parent-directory segment', '..'],
      ['a query string', 'abc?expand=true'],
      ['a fragment', 'abc#frag'],
      ['an empty string', ''],
    ])('rejects a significant event context whose event_uuid carries %s', async (_label, uuid) => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'significant_event', id: 'se-1' },
          trigger_type: 'manual',
          context: { event_uuid: uuid },
        })
      ).rejects.toThrow(InvalidInvestigationContextError);
      expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    });

    // A non-string cannot travel through `start`'s typed signature, so it is asserted against the
    // schema directly. This is the shape an untyped caller sends: a JSON body, or a workflow step
    // whose input schema is a record of unknown.
    it('rejects an event_uuid that is not a string at all', () => {
      expect(freeFormContextSchema.safeParse({ event_uuid: { nested: true } }).success).toBe(false);
    });

    it('accepts the uuid shape the significant events plugin actually sends', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-791');

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'significant_event', id: 'se-1' },
          trigger_type: 'manual',
          context: { event_uuid: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' },
        })
      ).resolves.toEqual({ investigation_id: 'inv-new' });
    });

    it('leaves the free-form context of a significant event subject alone', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-790');

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'significant_event', id: 'se-1' },
          trigger_type: 'manual',
          context: { event_uuid: 'se-1', severity: 'high' },
        })
      ).resolves.toEqual({ investigation_id: 'inv-new' });
    });

    it('does not require alerts for a significant event subject', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-789');

      await expect(
        makeClient().start({
          title: 'Latency is too high',
          subject: { type: 'significant_event', id: 'se-1' },
          trigger_type: 'manual',
        })
      ).resolves.toEqual({ investigation_id: 'inv-new' });
    });

    it('builds the brief from the snapshot rather than the bare subject id', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-321');

      await makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'alert', id: 'alert-1' },
        trigger_type: 'manual',
        context: alertContext,
      });

      const inputs = mockManagement.runWorkflow.mock.calls[0][2];
      expect(inputs.message).toContain('Latency is too high');
      expect(inputs.message).not.toBe('Investigation requested for alert alert-1');
    });

    // The composed brief is only for alert subjects; a caller-supplied message still wins
    // everywhere else, which is the behaviour every non-alert caller already relies on.
    it('keeps the caller-supplied message for a significant event subject', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-654');

      await makeClient().start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'se-1' },
        trigger_type: 'manual',
        message: 'Checkout latency breach',
        context: { alerts: [alertContext.alerts[0]] },
      });

      const inputs = mockManagement.runWorkflow.mock.calls[0][2];
      expect(inputs.message).toBe('Checkout latency breach');
    });
  });
});

describe('NightshiftInvestigationsClient.start() on investigations', () => {
  const mockWorkflow = {
    id: BOUND_WORKFLOW_ID,
    enabled: true,
    valid: true,
    definition: BOUND_DEFINITION,
  };
  const makeAlert = (id: string) => ({
    id,
    rule_id: 'rule-1',
    rule_name: 'Latency is too high',
    rule_type_id: 'apm.transaction_duration',
    rule_category: 'Latency threshold',
    reason: `Latency is 2.5s for ${id}`,
    status: 'active',
    start: '2026-08-24T12:00:00.000Z',
  });
  const startAlerts = (...ids: string[]) =>
    makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'alert', id: ids[0] },
      trigger_type: 'automatic',
      context: { alerts: ids.map(makeAlert) },
    });
  const runInputs = () => mockManagement.runWorkflow.mock.calls[0][2];

  beforeEach(() => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-1');
  });

  const telemetryConfig = {
    default_telemetry_target: 'orca',
    telemetry_targets: { c0: { connector_id: 'c0' }, orca: { connector_id: 'orca' } },
  };

  it('keeps a matched investigation target when the follow-up omits it', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1', telemetryTarget: 'c0' }));
    await makeClient({ telemetryConfig }).start({
      subject: { type: 'manual', id: 'question' },
      trigger_type: 'manual',
    });
    expect(runInputs()).toMatchObject({ investigation_id: 'inv-1', telemetry_target: 'c0' });
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it.each(['c0', 'none', undefined])(
    'defers an omitted target to the pending investigation binding %p',
    async (target) => {
      subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-pending' });
      const client = makeClient({
        telemetryConfig: { ...telemetryConfig, telemetry_connector_id: 'legacy' },
      });

      await expect(
        client.start({
          subject: { type: 'alert', id: 'alert-1' },
          trigger_type: 'automatic',
          context: { alerts: [makeAlert('alert-1')] },
        })
      ).resolves.toEqual({ investigation_id: 'inv-pending' });

      const inputs = runInputs();
      expect(inputs.telemetry_target).toBeUndefined();
      expect(conversations.create).not.toHaveBeenCalled();

      // The first run creates the conversation before this queued follow-up is ensured.
      withConversations(
        makeConversation({
          id: 'inv-pending',
          telemetryTarget: target,
          workflowExecutionIds: ['exec-original'],
        })
      );
      mockManagement.getWorkflowExecution.mockResolvedValue({
        effectiveIdentity: INVESTIGATOR_IDENTITY,
        id: 'exec-1',
        workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
        status: ExecutionStatus.RUNNING,
        context: { inputs },
      });

      await expect(client.ensureOrCreate('inv-pending', 'exec-1')).resolves.toBe('inv-pending');
      expect(conversations.create).not.toHaveBeenCalled();
      expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-pending', {
        workflow_execution_ids: ['exec-original', 'exec-1'],
      });
      const expectedConnectorId = target === 'none' ? undefined : target ?? 'legacy';
      expect((await client.getTelemetryTarget('inv-pending')).connectorId).toBe(
        expectedConnectorId
      );
    }
  );

  it('rejects changing a matched investigation target before launching its follow-up', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1', telemetryTarget: 'c0' }));
    await expect(
      makeClient({ telemetryConfig }).start({
        subject: { type: 'manual', id: 'question' },
        trigger_type: 'manual',
        telemetry_target: 'orca',
      })
    ).rejects.toThrow('cannot change its telemetry target');
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('claims the subjects, runs the workflow, and leaves recording the subjects to it', async () => {
    await expect(startAlerts('alert-1', 'alert-2')).resolves.toEqual({
      investigation_id: 'inv-new',
    });

    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
    expect(subjectsClient.claimSubjects).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'inv-new',
        subjects: [
          { type: 'alert', id: 'alert-1' },
          { type: 'alert', id: 'alert-2' },
        ],
      })
    );
    expect(runInputs()).toMatchObject({
      investigation_id: 'inv-new',
      subjects: [
        { type: 'alert', id: 'alert-1', triggerType: 'automatic', snapshot: makeAlert('alert-1') },
        { type: 'alert', id: 'alert-2', triggerType: 'automatic', snapshot: makeAlert('alert-2') },
      ],
    });
  });

  it('creates the conversation of a new investigation once the start is accepted, with the run recorded', async () => {
    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-new' });

    // The run is recorded in the creating write, so the investigation never reads as not in
    // progress between its creation and a separate metadata patch.
    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inv-new',
        templateId: 'investigation',
        metadata: { severity: 'medium', workflow_execution_ids: ['exec-1'] },
      })
    );
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
    // After the claim and the run, so a denied or failed start creates nothing.
    expect(subjectsClient.claimSubjects.mock.invocationCallOrder[0]).toBeLessThan(
      conversations.create.mock.invocationCallOrder[0]
    );
    expect(mockManagement.runWorkflow.mock.invocationCallOrder[0]).toBeLessThan(
      conversations.create.mock.invocationCallOrder[0]
    );
  });

  it('does not record the run again when the workflow created the conversation first', async () => {
    withConversations(makeConversation({ id: 'inv-new', workflowExecutionIds: ['exec-1'] }));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-new' });

    expect(conversations.create).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  it('still starts the investigation when creating its conversation fails', async () => {
    conversations.create.mockRejectedValueOnce(new Error('boom'));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-new' });

    expect(mockManagement.runWorkflow).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('creates no conversation when a start fails to run the workflow', async () => {
    mockManagement.runWorkflow.mockRejectedValueOnce(new Error('Workflow launch failed'));

    await expect(startAlerts('alert-1')).rejects.toThrow('Workflow launch failed');

    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('creates no conversation for a follow-up', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-pending' });

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-pending' });

    expect(conversations.create).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  it('continues the most recently updated open investigation sharing any subject', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([
      { id: 'inv-recent' },
      { id: 'inv-older' },
    ]);
    withConversations(
      makeConversation({ id: 'inv-recent' }),
      makeConversation({ id: 'inv-older' })
    );
    subjectsClient.listByConversationIds.mockResolvedValue([
      makeStoredSubject({ conversationId: 'inv-recent', subjectId: 'alert-1' }),
    ]);

    await expect(startAlerts('alert-1', 'alert-3')).resolves.toEqual({
      investigation_id: 'inv-recent',
    });

    expect(agenticInvestigationsClient.findOpenBySubjects).toHaveBeenCalledWith([
      { type: 'alert', id: 'alert-1' },
      { type: 'alert', id: 'alert-3' },
    ]);
    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    expect(subjectsClient.listByConversationIds).toHaveBeenCalledWith(['inv-recent']);
    const inputs = runInputs();
    expect(inputs.investigation_id).toBe('inv-recent');
    // Only the subject the investigation does not hold yet is added.
    expect(inputs.subjects).toEqual([expect.objectContaining({ id: 'alert-3' })]);
    // The brief says it continues and describes the new alert only.
    expect(inputs.message).toContain('This continues the investigation');
    expect(inputs.message).toContain('Latency is 2.5s for alert-3');
    expect(inputs.message).not.toContain('Latency is 2.5s for alert-1');
  });

  it('does not charge the automatic quota for a start that continues an open investigation', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue([makeStoredSubject()]);
    // Exhausted: a new investigation would be denied, a follow-up is not.
    investigationQuotaCallback.mockResolvedValue({ allowed: false });

    await expect(startAlerts('alert-1', 'alert-2')).resolves.toEqual({ investigation_id: 'inv-1' });

    expect(investigationQuotaCallback).not.toHaveBeenCalled();
    expect(runInputs().subjects).toEqual([expect.objectContaining({ id: 'alert-2' })]);
  });

  it('charges the automatic quota after matching and before claiming a new investigation', async () => {
    await startAlerts('alert-1');

    expect(investigationQuotaCallback).toHaveBeenCalledTimes(1);
    expect(agenticInvestigationsClient.findOpenBySubjects.mock.invocationCallOrder[0]).toBeLessThan(
      investigationQuotaCallback.mock.invocationCallOrder[0]
    );
    expect(investigationQuotaCallback.mock.invocationCallOrder[0]).toBeLessThan(
      subjectsClient.claimSubjects.mock.invocationCallOrder[0]
    );
  });

  it('denies a new automatic investigation over quota without claiming its subjects', async () => {
    investigationQuotaCallback.mockResolvedValue({ allowed: false });

    await expect(startAlerts('alert-1')).rejects.toThrow(InvestigationQuotaDeniedError);

    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
  });

  describe('with an automation budget', () => {
    let repository: ReturnType<typeof createBudgetRepository>;
    const startWithBudget = (
      dailyLimit: number,
      triggerType: StartInvestigationRequest['trigger_type'] = 'automatic'
    ) =>
      makeClient().start(
        {
          subject: { type: 'alert', id: 'alert-1' },
          trigger_type: triggerType,
          context: { alerts: [makeAlert('alert-1')] },
        },
        { automationBudget: createAutomationBudget(repository, 'a1', dailyLimit) }
      );
    const usage = () => readAutomationUsage(repository, 'a1');

    beforeEach(() => {
      repository = createBudgetRepository();
    });

    it('charges the automation budget before the global quota', async () => {
      await startWithBudget(1);

      expect(await usage()).toBe(1);
      expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(
        investigationQuotaCallback.mock.invocationCallOrder[0]
      );
    });

    it('releases the automation budget when the global quota denies the start', async () => {
      investigationQuotaCallback.mockResolvedValue({ allowed: false });

      await expect(startWithBudget(1)).rejects.toBeInstanceOf(InvestigationQuotaDeniedError);

      expect(await usage()).toBe(0);
      expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    });

    it('does not charge the global quota when the automation budget denies the start', async () => {
      await expect(startWithBudget(0)).rejects.toBeInstanceOf(AutomationDailyLimitReachedError);

      expect(investigationQuotaCallback).not.toHaveBeenCalled();
      expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    });

    it('admits one of two starts racing for the last slot', async () => {
      const results = await Promise.allSettled([startWithBudget(1), startWithBudget(1)]);

      expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(results).toContainEqual({
        status: 'rejected',
        reason: expect.any(AutomationDailyLimitReachedError),
      });
      expect(await usage()).toBe(1);
      expect(investigationQuotaCallback).toHaveBeenCalledTimes(1);
    });

    it('releases the automation budget when the start loses the claim and continues the holder', async () => {
      subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-holder' });
      withConversations(makeConversation({ id: 'inv-holder' }));

      await expect(startWithBudget(1)).resolves.toEqual({ investigation_id: 'inv-holder' });

      expect(await usage()).toBe(0);
    });

    it.each([
      [
        'the workflow launch',
        () => mockManagement.runWorkflow.mockRejectedValueOnce(new Error('failed')),
      ],
      [
        'the agent installation',
        () => installInvestigationAgentMock.mockRejectedValueOnce(new Error('failed')),
      ],
    ])('keeps the automation slot with the claim when %s fails', async (_step, fail) => {
      fail();

      await expect(startWithBudget(1)).rejects.toThrow('failed');

      expect(await usage()).toBe(1);
    });

    it('counts once an investigation a retry opens on the claim of a failed start', async () => {
      mockNewInvestigationId.mockReturnValueOnce('inv-failed');
      mockManagement.runWorkflow.mockRejectedValueOnce(new Error('failed'));
      await expect(startWithBudget(2)).rejects.toThrow('failed');
      subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-failed' });

      await expect(startWithBudget(2)).resolves.toEqual({ investigation_id: 'inv-failed' });

      expect(await usage()).toBe(1);
    });

    it('does not use the automation budget for a follow-up or a manual start', async () => {
      agenticInvestigationsClient.findOpenBySubjects.mockResolvedValueOnce([{ id: 'inv-1' }]);
      withConversations(makeConversation({ id: 'inv-1' }));
      subjectsClient.listByConversationIds.mockResolvedValue([makeStoredSubject()]);

      await expect(startWithBudget(1)).resolves.toEqual({ investigation_id: 'inv-1' });
      await startWithBudget(0, 'manual');

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  it('describes the alerts again when every alert is already part of the investigation', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue([makeStoredSubject()]);

    await startAlerts('alert-1');

    const inputs = runInputs();
    expect(inputs.subjects).toEqual([]);
    expect(inputs.message).toContain('reported again');
    expect(inputs.message).toContain('Latency is 2.5s for alert-1');
  });

  it('prefixes a non-alert follow-up with the caller message', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1' }));

    await makeClient().start({
      title: 'Checkout errors',
      subject: { type: 'significant_event', id: 'se-1' },
      trigger_type: 'automatic',
      message: 'Checkout errors re-opened',
    });

    expect(runInputs().message).toMatch(
      /^This continues the investigation[\s\S]*Checkout errors re-opened$/
    );
  });

  it('never continues a closed investigation', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-closed' }]);
    withConversations(makeConversation({ id: 'inv-closed', status: 'closed' }));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-new' });
    expect(subjectsClient.claimSubjects).toHaveBeenCalled();
  });

  it('continues an open investigation another identity owns', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-theirs' }]);
    withConversations(makeConversation({ id: 'inv-theirs', owner: false }));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-theirs' });
    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
  });

  it('opens a new investigation rather than continue one without room for the new subjects', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-full' }]);
    withConversations(makeConversation({ id: 'inv-full' }));
    subjectsClient.listByConversationIds.mockResolvedValue(
      Array.from({ length: 100 }, (_, n) =>
        makeStoredSubject({ conversationId: 'inv-full', subjectId: `alert-${n}` })
      )
    );

    // alert-1 is held already; alert-100 does not fit.
    await expect(startAlerts('alert-1', 'alert-100')).resolves.toEqual({
      investigation_id: 'inv-new',
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('no room'));
    expect(subjectsClient.claimSubjects).toHaveBeenCalled();
    expect(runInputs().subjects.map(({ id }: { id: string }) => id)).toEqual([
      'alert-1',
      'alert-100',
    ]);
  });

  it('continues a full investigation when every subject of the start is already in it', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-full' }]);
    withConversations(makeConversation({ id: 'inv-full' }));
    subjectsClient.listByConversationIds.mockResolvedValue(
      Array.from({ length: 100 }, (_, n) =>
        makeStoredSubject({ conversationId: 'inv-full', subjectId: `alert-${n}` })
      )
    );

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-full' });
  });

  it('does not continue a claim holder without room for the new subjects', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-holder' });
    withConversations(makeConversation({ id: 'inv-holder' }));
    subjectsClient.listByConversationIds.mockResolvedValue(
      Array.from({ length: 100 }, (_, n) =>
        makeStoredSubject({ conversationId: 'inv-holder', subjectId: `other-${n}` })
      )
    );

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-new' });
  });

  it('continues the investigation holding a claimed subject', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-holder' });
    withConversations(makeConversation({ id: 'inv-holder' }));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-holder' });
    expect(runInputs().investigation_id).toBe('inv-holder');
  });

  it('continues a claim holder whose conversation its own workflow has not created yet', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-pending' });

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-pending' });
  });

  it('continues a claim holder another identity owns', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-theirs' });
    withConversations(makeConversation({ id: 'inv-theirs', owner: false }));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-theirs' });
  });

  it('treats a closed or missing claim holder as no longer holding the subject', async () => {
    withConversations(makeConversation({ id: 'inv-closed', status: 'closed' }));
    await startAlerts('alert-1');

    const { isHolderOpen } = subjectsClient.claimSubjects.mock.calls[0][0];
    await expect(isHolderOpen('inv-closed')).resolves.toBe(false);
    await expect(isHolderOpen('inv-missing')).resolves.toBe(false);
  });

  it('records a question without a subject id under the new investigation, matching nothing', async () => {
    await makeClient().start({
      title: 'Payment timeouts',
      subject: { type: 'manual', id: 'manual' },
      trigger_type: 'manual',
      message: 'Why did payment timeouts increase?',
    });

    expect(agenticInvestigationsClient.findOpenBySubjects).not.toHaveBeenCalled();
    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    expect(runInputs().subjects).toEqual([
      expect.objectContaining({ type: 'manual', id: 'inv-new' }),
    ]);
  });

  it('throws InvestigationUnavailableError without agentic investigations', async () => {
    await expect(
      makeClient({ agenticInvestigations: undefined }).start({
        title: 'Latency is too high',
        subject: { type: 'significant_event', id: 'se-1' },
        trigger_type: 'manual',
      })
    ).rejects.toThrow(InvestigationUnavailableError);
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
  });
});

describe('NightshiftInvestigationsClient.ensureOrCreate()', () => {
  const subjects = [
    { type: 'alert', id: 'alert-1', triggerType: 'automatic' },
    { type: 'alert', id: 'alert-2', triggerType: 'automatic' },
  ];
  const withExecution = ({
    inputs = { title: 'Latency is too high', investigation_id: 'inv-1', subjects },
    status = ExecutionStatus.RUNNING,
    workflowId = NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  }: {
    inputs?: Record<string, unknown>;
    status?: ExecutionStatus;
    workflowId?: string;
  } = {}) =>
    mockManagement.getWorkflowExecution.mockResolvedValue({
      effectiveIdentity: INVESTIGATOR_IDENTITY,
      id: 'exec-1',
      workflowId,
      status,
      context: { inputs },
    });

  it.each([
    ['as the caller', { type: 'user', id: 'elastic' }],
    ['as another service account', { type: 'service_account', id: 'kibana/other' }],
    ['without an identity', undefined],
  ])('rejects a run that executes %s before touching the investigation', async (_, identity) => {
    mockManagement.getWorkflowExecution.mockResolvedValue({
      id: 'exec-1',
      workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      effectiveIdentity: identity,
      status: ExecutionStatus.RUNNING,
      context: { inputs: { investigation_id: 'inv-1', subjects } },
    });

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).rejects.toThrow(
      /only run as the Nightshift service account/
    );
    expect(conversations.create).not.toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  const telemetryConfig = {
    default_telemetry_target: 'orca',
    telemetry_targets: { c0: { connector_id: 'c0' }, orca: { connector_id: 'orca' } },
  };

  it.each(['c0', 'orca', 'none'])(
    'binds the %s target to a new shared investigation conversation',
    async (target) => {
      withExecution({ inputs: { investigation_id: 'inv-1', subjects, telemetry_target: target } });
      await makeClient({ telemetryConfig }).ensureOrCreate('inv-1', 'exec-1');
      expect(conversations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'nightshift.investigation',
          metadata: {
            severity: 'medium',
            telemetry_target: target,
            workflow_execution_ids: ['exec-1'],
          },
          templateId: 'investigation',
        })
      );
      expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', subjects);
    }
  );

  it('keeps the conversation target when a later run omits it', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1', telemetryTarget: 'c0' }));
    const client = makeClient({ telemetryConfig });
    await client.ensureOrCreate('inv-1', 'exec-1');
    await expect(client.getTelemetryTarget('inv-1')).resolves.toMatchObject({
      connectorId: 'c0',
      allowSecretFallback: false,
    });
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('keeps direct chats on the investigator working without an investigation template', async () => {
    withConversations(makeConversation({ id: 'chat-1', templateId: 'default' }));
    await expect(
      makeClient({
        telemetryConfig: { ...telemetryConfig, telemetry_connector_id: 'legacy' },
      }).getTelemetryTarget('chat-1')
    ).resolves.toMatchObject({ connectorId: 'legacy' });
  });

  it('keeps legacy telemetry when a named default is added', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1' }));
    const client = makeClient({
      telemetryConfig: { ...telemetryConfig, telemetry_connector_id: 'legacy' },
    });
    await client.ensureOrCreate('inv-1', 'exec-1');
    await expect(client.getTelemetryTarget('inv-1')).resolves.toMatchObject({
      connectorId: 'legacy',
    });
    expect(conversations.create).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalledWith(
      'inv-1',
      expect.objectContaining({ telemetry_target: expect.anything() })
    );
  });

  it.each(['a'.repeat(64), 'orca-', 'orca_'])(
    'accepts target %s without turning its name into an agent id',
    async (target) => {
      withExecution({ inputs: { investigation_id: 'inv-1', telemetry_target: target } });
      await makeClient({
        telemetryConfig: { telemetry_targets: { [target]: { connector_id: 'telemetry' } } },
      }).ensureOrCreate('inv-1', 'exec-1');
      expect(conversations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'nightshift.investigation',
          metadata: {
            severity: 'medium',
            telemetry_target: target,
            workflow_execution_ids: ['exec-1'],
          },
        })
      );
    }
  );

  it('rejects another target before reopening or recording subjects and execution metadata', async () => {
    withExecution({ inputs: { investigation_id: 'inv-1', subjects, telemetry_target: 'orca' } });
    withConversations(makeConversation({ id: 'inv-1', status: 'closed', telemetryTarget: 'c0' }));
    await expect(makeClient({ telemetryConfig }).ensureOrCreate('inv-1', 'exec-1')).rejects.toThrow(
      'cannot change its telemetry target'
    );
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  it('rejects a run as the agent account when the space is no longer set up', async () => {
    withExecution();
    mockManagement.getWorkflow.mockResolvedValueOnce(null);

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).rejects.toThrow(
      /only run as the Nightshift service account/
    );
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('stores the target while using the single investigator for an early failure', async () => {
    withExecution({
      inputs: { investigation_id: 'inv-1', telemetry_target: 'c0' },
      status: ExecutionStatus.FAILED,
    });
    await makeClient({ telemetryConfig }).ensureForFailure(
      'inv-1',
      'exec-1',
      'Sandbox startup failed'
    );
    expect(installInvestigationAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: SPACE_ID, availability: mockAgentAvailability })
    );
    expect(conversations.addEvents).toHaveBeenCalledWith({
      conversationId: 'inv-1',
      events: [
        {
          type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
          data: { execution_id: 'exec-1', reason: 'Sandbox startup failed' },
        },
      ],
    });
    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'nightshift.investigation',
        metadata: {
          severity: 'medium',
          telemetry_target: 'c0',
          workflow_execution_ids: ['exec-1'],
        },
      })
    );
  });

  it('creates the investigation conversation and records the run subjects', async () => {
    withExecution();

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).resolves.toBe('inv-1');

    expect(mockManagement.getWorkflowExecution).toHaveBeenCalledWith('exec-1', SPACE_ID, {
      includeOutput: false,
      request: mockRequest,
    });
    // Without a title, so Agent Builder generates one on the run's first round; the run's
    // `title` input is not stored.
    expect(conversations.create).toHaveBeenCalledWith({
      id: 'inv-1',
      agentId: 'nightshift.investigation',
      templateId: 'investigation',
      accessControl: { access_mode: 'public' },
      metadata: {
        // Starts at medium; the agent re-rates it when it concludes.
        severity: 'medium',
        // The run is recorded in the creating write, so the investigation reads as in progress
        // from the moment it exists.
        workflow_execution_ids: ['exec-1'],
      },
    });
    // A conversation this call created holds no subjects yet.
    expect(subjectsClient.listByConversationIds).not.toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', subjects);
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  it('appends the run to the runs an investigation already records, once', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1', workflowExecutionIds: ['exec-0'] }));

    await makeClient().ensureOrCreate('inv-1', 'exec-1');
    expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-1', {
      workflow_execution_ids: ['exec-0', 'exec-1'],
    });

    conversations.patchMetadata.mockClear();
    withConversations(
      makeConversation({ id: 'inv-1', workflowExecutionIds: ['exec-0', 'exec-1'] })
    );
    await makeClient().ensureOrCreate('inv-1', 'exec-1');
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  it('records only the subjects an existing investigation does not hold', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue([makeStoredSubject()]);

    await makeClient().ensureOrCreate('inv-1', 'exec-1');

    expect(conversations.create).not.toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [subjects[1]]);
  });

  it('records only the subjects that fit an investigation near its subject ceiling', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue(
      Array.from({ length: 99 }, (_, n) => makeStoredSubject({ subjectId: `other-${n}` }))
    );

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).resolves.toBe('inv-1');

    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [subjects[0]]);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('room for 1 of 2'));
  });

  it('reopens a closed investigation it continues', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1', status: 'closed' }));

    await makeClient().ensureOrCreate('inv-1', 'exec-1');

    expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-1', {
      status: 'open',
      workflow_execution_ids: ['exec-1'],
    });
  });

  it.each(['open', 'closed'] as const)(
    'preserves %s status when recording a failed run',
    async (status) => {
      withExecution();
      withConversations(makeConversation({ id: 'inv-1', status }));
      installInvestigationAgentMock.mockRejectedValue(new Error('Agent setup unavailable'));
      await makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied');
      expect(installInvestigationAgentMock).not.toHaveBeenCalled();
      expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-1', {
        workflow_execution_ids: ['exec-1'],
      });
    }
  );

  it('materializes an early failure and allows failed-run replay', async () => {
    withExecution({ status: ExecutionStatus.FAILED });
    await makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied');
    expect(installInvestigationAgentMock).toHaveBeenCalledWith({
      agentBuilder: mockAgentBuilder,
      spaceId: SPACE_ID,
      availability: mockAgentAvailability,
    });
    expect(installInvestigationAgentMock.mock.invocationCallOrder[0]).toBeLessThan(
      conversations.create.mock.invocationCallOrder[0]
    );
    expect(conversations.create).toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', subjects);
  });

  it('records the validated request and failure before attaching subjects', async () => {
    withExecution({
      inputs: {
        investigation_id: 'inv-1',
        message: 'Why is checkout slow?\nCheck recent deployments.',
        subjects,
        context: { token: 'must-not-be-copied' },
      },
    });

    await makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied');

    expect(conversations.addEvents).toHaveBeenCalledWith({
      conversationId: 'inv-1',
      events: [
        {
          type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
          data: {
            execution_id: 'exec-1',
            request: 'Why is checkout slow?\nCheck recent deployments.',
            reason: 'Permission denied',
          },
        },
      ],
    });
    expect(conversations.addEvents.mock.invocationCallOrder[0]).toBeLessThan(
      subjectsClient.upsertSubjects.mock.invocationCallOrder[0]
    );
  });

  it('retains the failure entry when subject attachment fails', async () => {
    withExecution();
    subjectsClient.upsertSubjects.mockRejectedValueOnce(new Error('Subject access denied'));

    await expect(
      makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied')
    ).rejects.toThrow('Subject access denied');
    expect(conversations.addEvents).toHaveBeenCalledTimes(1);
  });

  it('logs a rejected timeline write and still records subjects and execution association', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1', status: 'closed' }));
    conversations.addEvents.mockRejectedValueOnce(new Error('Timeline access denied'));

    await expect(
      makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied')
    ).resolves.toBe('inv-1');
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', subjects);
    expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-1', {
      workflow_execution_ids: ['exec-1'],
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Timeline access denied'));
  });

  it.each([undefined, '', ' \n '])(
    'omits an unavailable request (%p) and defaults an empty reason',
    async (message) => {
      withExecution({ inputs: { investigation_id: 'inv-1', message } });

      await makeClient().ensureForFailure('inv-1', 'exec-1', '  ');

      expect(conversations.addEvents).toHaveBeenCalledWith({
        conversationId: 'inv-1',
        events: [
          {
            type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
            data: { execution_id: 'exec-1', reason: 'Investigation failed' },
          },
        ],
      });
    }
  );

  it('bounds request and reason text recovered from a workflow execution', async () => {
    withExecution({
      inputs: { investigation_id: 'inv-1', message: 'x'.repeat(20_000) },
    });

    await makeClient().ensureForFailure('inv-1', 'exec-1', 'y'.repeat(20_000));

    expect(conversations.addEvents).toHaveBeenCalledWith({
      conversationId: 'inv-1',
      events: [
        {
          type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
          data: {
            execution_id: 'exec-1',
            request: 'x'.repeat(MAX_INVESTIGATION_RUN_FAILURE_TEXT_LENGTH),
            reason: 'y'.repeat(MAX_INVESTIGATION_RUN_FAILURE_TEXT_LENGTH),
          },
        },
      ],
    });
  });

  it.each([
    ['another investigation', { investigation_id: 'inv-2' }],
    ['another workflow', { investigation_id: 'inv-1' }],
  ])('does not record failure for a run of %s', async (label, inputs) => {
    withExecution({ inputs, ...(label === 'another workflow' ? { workflowId: 'other' } : {}) });

    await expect(
      makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied')
    ).rejects.toThrow(InvestigationNotFoundError);
    expect(conversations.addEvents).not.toHaveBeenCalled();
  });

  it('does not record failure when the execution is missing or inaccessible in this space', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(null);

    await expect(
      makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied')
    ).rejects.toThrow(InvestigationNotFoundError);
    expect(mockManagement.getWorkflowExecution).toHaveBeenCalledWith('exec-1', SPACE_ID, {
      includeOutput: false,
      request: mockRequest,
    });
    expect(conversations.addEvents).not.toHaveBeenCalled();
  });

  it('does not record failure when conversation access is denied', async () => {
    withExecution();
    conversations.bulkGet.mockRejectedValueOnce(new Error('Conversation access denied'));

    await expect(
      makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied')
    ).rejects.toThrow('Conversation access denied');
    expect(conversations.addEvents).not.toHaveBeenCalled();
  });

  it('waits for a newly installed agent to become visible when recording an early failure', async () => {
    withExecution();
    conversations.create.mockRejectedValueOnce(
      createAgentNotFoundError({ agentId: 'nightshift.investigation' })
    );
    await makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied');
    expect(installInvestigationAgentMock).toHaveBeenCalledTimes(1);
    expect(conversations.create).toHaveBeenCalledTimes(2);
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', subjects);
  });

  it.each([ExecutionStatus.COMPLETED, ExecutionStatus.CANCELLED, ExecutionStatus.TIMED_OUT])(
    'does not materialize failure for an execution already %s',
    async (status) => {
      withExecution({ status });
      await expect(
        makeClient().ensureForFailure('inv-1', 'exec-1', 'Permission denied')
      ).rejects.toThrow(InvestigationNotFoundError);
      expect(conversations.create).not.toHaveBeenCalled();
    }
  );

  describe('for an alert recovery follow-up', () => {
    const recoveryInputs = {
      investigation_id: 'inv-1',
      message: 'Alert recovered',
      context: { source: 'alert', follow_up: 'alert_recovered' },
    };

    it('continues an investigation that is still open, recording no subject', async () => {
      withExecution({ inputs: recoveryInputs });
      withConversations(makeConversation({ id: 'inv-1', workflowExecutionIds: ['exec-0'] }));

      await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).resolves.toBe('inv-1');

      expect(conversations.create).not.toHaveBeenCalled();
      expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
      expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-1', {
        workflow_execution_ids: ['exec-0', 'exec-1'],
      });
    });

    it.each([
      ['ensureOrCreate', 'closed'],
      ['ensureOrCreate', 'deleted'],
      ['ensureForFailure', 'closed'],
      ['ensureForFailure', 'deleted'],
    ] as const)(
      '%s neither reopens nor recreates an investigation %s while the follow-up waited',
      async (method, state) => {
        withExecution({ inputs: recoveryInputs });
        if (state === 'closed') {
          withConversations(makeConversation({ id: 'inv-1', status: 'closed' }));
        }

        const client = makeClient();
        const result =
          method === 'ensureForFailure'
            ? client.ensureForFailure('inv-1', 'exec-1', 'Permission denied')
            : client.ensureOrCreate('inv-1', 'exec-1');

        await expect(result).rejects.toThrow(InvestigationNotFoundError);

        expect(conversations.create).not.toHaveBeenCalled();
        expect(conversations.patchMetadata).not.toHaveBeenCalled();
        expect(installInvestigationAgentMock).not.toHaveBeenCalled();
      }
    );
  });

  it('reopens an investigation another identity owns', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1', status: 'closed', owner: false }));

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).resolves.toBe('inv-1');

    expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-1', {
      status: 'open',
      workflow_execution_ids: ['exec-1'],
    });
  });

  it('starts an investigation for a run started without one, from its context', async () => {
    withExecution({
      inputs: {
        title: 'Checkout errors',
        context: {
          source: 'significant_event',
          significant_event_id: 'se-1',
          summary: 'Checkout errors spiked',
          trigger_type: 'manual',
        },
      },
    });

    await expect(makeClient().ensureOrCreate('exec-1')).resolves.toBe('exec-1');

    expect(mockManagement.getWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      SPACE_ID,
      expect.anything()
    );
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('exec-1', [
      {
        type: 'significant_event',
        id: 'se-1',
        triggerType: 'manual',
        summary: 'Checkout errors spiked',
      },
    ]);
  });

  it('records no subject for a run whose inputs describe none', async () => {
    withExecution({ inputs: { title: 'Free-form question' } });

    await makeClient().ensureOrCreate('exec-1');

    expect(conversations.create).toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('agrees with a concurrent run that created the conversation first', async () => {
    withExecution();
    conversations.create.mockRejectedValue(
      createConversationAlreadyExistsError({ conversationId: 'inv-1' })
    );
    conversations.bulkGet
      .mockResolvedValueOnce(new Map())
      .mockResolvedValue(new Map([['inv-1', makeConversation({ id: 'inv-1' })]]));

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).resolves.toBe('inv-1');
  });

  it('rejects an id that names a conversation which is not an investigation', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1', templateId: 'escalation' }));

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).rejects.toThrow(
      InvestigationNotFoundError
    );
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it.each<[string, Parameters<typeof withExecution>[0]]>([
    [
      'a run that names a different investigation',
      { inputs: { title: 't', investigation_id: 'inv-2' } },
    ],
    ['a run that has finished', { status: ExecutionStatus.COMPLETED }],
    ['a run of another workflow', { workflowId: 'some-other-workflow' }],
  ])('rejects %s', async (_label, execution) => {
    withExecution(execution);

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).rejects.toThrow(
      InvestigationNotFoundError
    );
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('rejects a run named by its own id when it works on another investigation', async () => {
    withExecution({ inputs: { title: 't', investigation_id: 'inv-2' } });

    await expect(makeClient().ensureOrCreate('exec-1')).rejects.toThrow(InvestigationNotFoundError);
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('rejects a run that does not exist', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(null);

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).rejects.toThrow(
      InvestigationNotFoundError
    );
  });

  it('creates the conversation for a run that carries no title', async () => {
    withExecution({ inputs: { investigation_id: 'inv-1', subjects } });

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).resolves.toBe('inv-1');
    expect(conversations.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: expect.anything() })
    );
  });
});

describe('NightshiftInvestigationsClient.findOrCreateSlackThread()', () => {
  const THREAD = { workspace: 'T1', channel: 'C1', threadTs: '1712345678.000100' };
  const THREAD_KEY = 'slack:T1:C1:1712345678.000100';
  const threadSubject = (slack: Partial<SlackThreadSubject> = {}) =>
    makeStoredSubject({
      subjectType: 'slack_thread',
      subjectId: THREAD_KEY,
      slack: { channel: 'C1', thread_ts: THREAD.threadTs, ...slack },
    });
  const handled = (eventId: string, executionId = 'exec-1') => ({
    event_id: eventId,
    execution_id: executionId,
  });

  it("finds the investigation by the thread's subject", async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1', title: 'Checkout is slow' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ status_message_ts: '1712345679.000200' }),
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toEqual({
      investigation_id: 'inv-1',
      title: 'Checkout is slow',
      status_message_ts: '1712345679.000200',
    });
    expect(subjectsClient.findConversationIdsBySubjects).toHaveBeenCalledWith([
      { type: 'slack_thread', id: THREAD_KEY },
    ]);
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('prefers an open investigation of the thread and ignores other conversations', async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['chat-1', 'inv-old', 'inv-1']);
    withConversations(
      makeConversation({ id: 'chat-1', templateId: 'other' }),
      makeConversation({ id: 'inv-old', status: 'closed' }),
      makeConversation({ id: 'inv-1', status: 'open' })
    );

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toMatchObject({ investigation_id: 'inv-1' });
  });

  it("headlines an investigation Agent Builder has not titled yet with the thread's question", async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1', title: DEFAULT_CONVERSATION_TITLE }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      { ...threadSubject(), summary: 'why is checkout slow?' },
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toEqual({ investigation_id: 'inv-1', title: 'why is checkout slow?' });
  });

  it('records a new status message on the thread subject', async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1', status: 'closed' }));
    subjectsClient.listByConversationIds.mockResolvedValue([threadSubject()]);

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false, statusMessageTs: '2.0' })
    ).resolves.toMatchObject({ status_message_ts: '2.0' });
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      {
        type: 'slack_thread',
        id: THREAD_KEY,
        slack: { channel: 'C1', thread_ts: THREAD.threadTs, status_message_ts: '2.0' },
      },
    ]);
  });

  it('writes the status message to an investigation another identity owns', async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1', owner: false }));

    await makeClient().findOrCreateSlackThread({
      ...THREAD,
      create: false,
      statusMessageTs: '2.0',
    });

    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      expect.objectContaining({
        slack: expect.objectContaining({ status_message_ts: '2.0' }),
      }),
    ]);
  });

  it('records a delivered event and answers one another execution handled as a duplicate', async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ seen_events: [handled('Ev0')] }),
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: false,
        event: { eventId: 'Ev1', executionId: 'exec-2' },
      })
    ).resolves.not.toHaveProperty('duplicate');
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      {
        type: 'slack_thread',
        id: THREAD_KEY,
        slack: {
          channel: 'C1',
          thread_ts: THREAD.threadTs,
          seen_events: [handled('Ev0'), handled('Ev1', 'exec-2')],
        },
      },
    ]);

    subjectsClient.upsertSubjects.mockClear();
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ seen_events: [handled('Ev0'), handled('Ev1', 'exec-2')] }),
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: false,
        event: { eventId: 'Ev1', executionId: 'exec-3' },
      })
    ).resolves.toMatchObject({ investigation_id: 'inv-1', duplicate: true });
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('does not treat the execution that handled an event asking again as a duplicate', async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ seen_events: [handled('Ev1')] }),
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: false,
        event: { eventId: 'Ev1', executionId: 'exec-1' },
      })
    ).resolves.not.toHaveProperty('duplicate');
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('gives an event back only for the execution that handled it', async () => {
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ seen_events: [handled('Ev0'), handled('Ev1')] }),
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: false,
        event: { eventId: 'Ev1', executionId: 'exec-2' },
        releaseEvent: true,
      })
    ).resolves.not.toHaveProperty('duplicate');
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();

    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: false,
        event: { eventId: 'Ev1', executionId: 'exec-1' },
        releaseEvent: true,
      })
    ).resolves.not.toHaveProperty('duplicate');
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      {
        type: 'slack_thread',
        id: THREAD_KEY,
        slack: { channel: 'C1', thread_ts: THREAD.threadTs, seen_events: [handled('Ev0')] },
      },
    ]);
  });

  it('remembers only the most recent delivered events', async () => {
    const seen = Array.from({ length: MAX_SLACK_SEEN_EVENTS }, (_, index) => handled(`Ev${index}`));
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1' }));
    subjectsClient.listByConversationIds.mockResolvedValue([threadSubject({ seen_events: seen })]);

    await makeClient().findOrCreateSlackThread({
      ...THREAD,
      create: false,
      event: { eventId: 'EvNew', executionId: 'exec-1' },
    });

    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      expect.objectContaining({
        slack: expect.objectContaining({ seen_events: [...seen.slice(1), handled('EvNew')] }),
      }),
    ]);
  });

  it('does not create an investigation for a thread without create', async () => {
    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toBeUndefined();
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('creates the investigation with the thread as its subject', async () => {
    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: true,
        text: '<@U123> why is   checkout slow?',
      })
    ).resolves.toEqual({ investigation_id: 'inv-new', title: 'why is checkout slow?' });

    expect(subjectsClient.claimSubjects).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'inv-new',
        subjects: [{ type: 'slack_thread', id: THREAD_KEY }],
      })
    );
    // The response headlines the question; the conversation is created without a title, so
    // Agent Builder generates one on the first round.
    expect(conversations.create).toHaveBeenCalledWith({
      id: 'inv-new',
      agentId: 'nightshift.investigation',
      templateId: 'investigation',
      // Starts at medium; the agent re-rates it when it concludes.
      metadata: { severity: 'medium' },
      accessControl: { access_mode: 'public' },
    });
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-new', [
      {
        type: 'slack_thread',
        id: THREAD_KEY,
        triggerType: 'manual',
        slack: { channel: 'C1', thread_ts: THREAD.threadTs },
        summary: 'why is checkout slow?',
      },
    ]);
  });

  it('records the status message and the event on the thread it creates', async () => {
    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: true,
        text: 'why is checkout slow?',
        statusMessageTs: '2.0',
        event: { eventId: 'Ev1', executionId: 'exec-1' },
      })
    ).resolves.toEqual({
      investigation_id: 'inv-new',
      title: 'why is checkout slow?',
      status_message_ts: '2.0',
    });
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-new', [
      expect.objectContaining({
        slack: {
          channel: 'C1',
          thread_ts: THREAD.threadTs,
          status_message_ts: '2.0',
          seen_events: [handled('Ev1')],
        },
      }),
    ]);
  });

  it('agrees with a concurrent create for the same thread', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-first' });

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: true, text: 'hello' })
    ).resolves.toMatchObject({ investigation_id: 'inv-first' });
    expect(conversations.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv-first' }));
  });

  it('tells the second of two concurrent creates for one event that it is a duplicate', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-first' });
    withConversations(makeConversation({ id: 'inv-first' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ seen_events: [handled('Ev1', 'exec-other')] }),
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({
        ...THREAD,
        create: true,
        event: { eventId: 'Ev1', executionId: 'exec-1' },
      })
    ).resolves.toMatchObject({ investigation_id: 'inv-first', duplicate: true });
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('keys a thread by workspace, channel, and thread, since channel ids repeat across workspaces', async () => {
    await makeClient().findOrCreateSlackThread({ ...THREAD, workspace: 'T2', create: false });

    expect(subjectsClient.findConversationIdsBySubjects).toHaveBeenCalledWith([
      { type: 'slack_thread', id: 'slack:T2:C1:1712345678.000100' },
    ]);
  });

  it('throws InvestigationUnavailableError when creating while investigations are unavailable', async () => {
    await expect(
      makeClient({ isAvailable: jest.fn().mockResolvedValue(false) }).findOrCreateSlackThread({
        ...THREAD,
        create: true,
      })
    ).rejects.toThrow(InvestigationUnavailableError);
    expect(conversations.create).not.toHaveBeenCalled();
  });
});

describe('NightshiftInvestigationsClient.getLifecycleSubject()', () => {
  it('attributes lifecycle events to the first recorded subject', async () => {
    subjectsClient.listByConversationIds.mockResolvedValue([
      makeStoredSubject({ subjectId: 'alert-2', createdAt: '2026-08-24T13:00:00.000Z' }),
      makeStoredSubject({
        subjectId: 'alert-1',
        triggerType: 'automatic',
        createdAt: '2026-08-24T12:00:00.000Z',
      }),
    ]);

    await expect(makeClient().getLifecycleSubject('inv-1')).resolves.toEqual({
      subject: { type: 'alert', id: 'alert-1' },
      triggerType: 'automatic',
      startedAt: '2026-08-24T12:00:00.000Z',
    });
    expect(subjectsClient.listByConversationIds).toHaveBeenCalledWith(['inv-1']);
  });

  it('reports a Slack thread as a slack_thread subject', async () => {
    subjectsClient.listByConversationIds.mockResolvedValue([
      makeStoredSubject({ subjectType: 'slack_thread', subjectId: 'slack:T:C:1' }),
    ]);

    await expect(makeClient().getLifecycleSubject('inv-1')).resolves.toMatchObject({
      subject: { type: 'slack_thread', id: 'slack:T:C:1' },
      triggerType: 'manual',
    });
  });

  it('prefers any other subject to a Slack thread recorded before it', async () => {
    subjectsClient.listByConversationIds.mockResolvedValue([
      makeStoredSubject({
        subjectType: 'slack_thread',
        subjectId: 'slack:T:C:1',
        createdAt: '2026-08-24T12:00:00.000Z',
      }),
      makeStoredSubject({ subjectId: 'alert-1', createdAt: '2026-08-24T13:00:00.000Z' }),
    ]);

    await expect(makeClient().getLifecycleSubject('inv-1')).resolves.toMatchObject({
      subject: { type: 'alert', id: 'alert-1' },
    });
  });

  it('returns undefined for an investigation without subjects', async () => {
    await expect(makeClient().getLifecycleSubject('inv-1')).resolves.toBeUndefined();
  });
});

describe('NightshiftInvestigationsClient notification destinations', () => {
  const destination = {
    type: 'slack',
    connector_id: 'slack-connector',
    params: { channel: 'C123' },
    automation_id: 'automation-1',
    automation_name: 'Checkout latency',
  };

  beforeEach(() => {
    mockManagement.getWorkflow.mockResolvedValue({
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: BOUND_DEFINITION,
    });
    mockManagement.runWorkflow.mockResolvedValue('exec-1');
  });

  const startManual = (extra: Pick<StartInvestigationRequest, 'notificationDestinations'> = {}) =>
    makeClient().start({
      subject: { type: 'manual', id: 'question' },
      message: 'Why is checkout slow?',
      trigger_type: 'manual',
      ...extra,
    });

  it('start() passes the destinations to the workflow', async () => {
    await startManual({ notificationDestinations: [destination] });

    expect(mockManagement.runWorkflow.mock.calls[0][2]).toMatchObject({
      investigation_id: 'inv-new',
      notificationDestinations: [destination],
    });
  });

  it('start() omits notificationDestinations from the inputs when none are given', async () => {
    await startManual();

    expect(mockManagement.runWorkflow.mock.calls[0][2]).not.toHaveProperty(
      'notificationDestinations'
    );
  });

  it('start() rejects an unsupported destination type before running the workflow', async () => {
    await expect(
      startManual({ notificationDestinations: [{ ...destination, type: 'pager' }] })
    ).rejects.toThrow('Unsupported notification type "pager"');
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
  });

  describe('getInvestigationExecutionContext()', () => {
    const withExecution = (
      inputs: Record<string, unknown>,
      workflowId = NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID
    ) =>
      mockManagement.getWorkflowExecution.mockResolvedValue({
        effectiveIdentity: INVESTIGATOR_IDENTITY,
        id: 'exec-1',
        workflowId,
        status: ExecutionStatus.COMPLETED,
        context: { inputs },
      });
    const sharedInvestigation = (overrides: Record<string, unknown> = {}) => ({
      id: 'inv-1',
      title: 'Checkout latency regression',
      title_pending: false,
      metadata: { status: 'open', severity: 'high', summary: 'p99 latency doubled.' },
      impact: {
        entities: [{ id: 'checkout', name: 'checkout' }, { id: 'payments' }],
        created_at: '2026-10-09T12:00:00.000Z',
      },
      proposals: [
        { id: 'p-1', title: 'Roll back', status: 'approved' },
        { id: 'p-2', title: 'Scale out checkout', status: 'pending' },
      ],
      ...overrides,
    });

    it('reads the run, its destinations, and the shared investigation', async () => {
      withExecution({ investigation_id: 'inv-1', notificationDestinations: [destination] });
      agenticInvestigationsClient.get.mockResolvedValue(sharedInvestigation());

      await expect(
        makeClient().getInvestigationExecutionContext('inv-1', 'exec-1')
      ).resolves.toEqual({
        investigation: {
          investigation_id: 'inv-1',
          title: 'Checkout latency regression',
          severity: 'high',
          summary: 'p99 latency doubled.',
          impact: { entities: [{ name: 'checkout' }, { name: 'payments' }] },
          recommendations: [{ title: 'Scale out checkout' }],
        },
        conversationId: 'inv-1',
        workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
        notificationDestinations: [destination],
      });
      expect(mockManagement.getWorkflowExecution).toHaveBeenCalledWith('exec-1', SPACE_ID, {
        includeOutput: false,
        request: mockRequest,
      });
    });

    it('uses the run title until Agent Builder titles the investigation', async () => {
      withExecution({ investigation_id: 'inv-1', title: 'Checkout latency' });
      agenticInvestigationsClient.get.mockResolvedValue(
        sharedInvestigation({ title: DEFAULT_CONVERSATION_TITLE, title_pending: true })
      );

      const { investigation, notificationDestinations } =
        await makeClient().getInvestigationExecutionContext('inv-1', 'exec-1');

      expect(investigation.title).toBe('Checkout latency');
      expect(notificationDestinations).toEqual([]);
    });

    it.each([
      ['another workflow', { investigation_id: 'inv-1' }, 'other-workflow'],
      [
        'another investigation',
        { investigation_id: 'inv-2' },
        NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      ],
    ])('rejects a run of %s', async (_, inputs, workflowId) => {
      withExecution(inputs, workflowId);

      await expect(
        makeClient().getInvestigationExecutionContext('inv-1', 'exec-1')
      ).rejects.toThrow(InvestigationNotFoundError);
      expect(agenticInvestigationsClient.get).not.toHaveBeenCalled();
    });

    it('rejects malformed destinations on the run', async () => {
      withExecution({
        investigation_id: 'inv-1',
        notificationDestinations: [{ ...destination, params: { channel: '' } }],
      });

      await expect(
        makeClient().getInvestigationExecutionContext('inv-1', 'exec-1')
      ).rejects.toThrow();
      expect(agenticInvestigationsClient.get).not.toHaveBeenCalled();
    });

    it('maps a missing conversation to InvestigationNotFoundError', async () => {
      withExecution({ investigation_id: 'inv-1' });
      agenticInvestigationsClient.get.mockRejectedValue(
        createConversationNotFoundError({ conversationId: 'inv-1' })
      );

      await expect(
        makeClient().getInvestigationExecutionContext('inv-1', 'exec-1')
      ).rejects.toThrow(InvestigationNotFoundError);
    });
  });
});

describe('NightshiftInvestigationsClient.recordSlackThreadStatusMessage()', () => {
  const THREAD_KEY = 'team:T1/channel:C1/thread:1.1';
  const MESSAGE = { investigationId: 'inv-1', channel: 'C1', threadTs: '1.1', messageTs: '1.2' };
  const threadSubject = (slack: Partial<SlackThreadSubject> = {}) =>
    makeStoredSubject({
      subjectType: 'slack_thread',
      subjectId: THREAD_KEY,
      slack: { channel: 'C1', thread_ts: '1.1', ...slack },
    });

  it("records the message on the investigation's subject for the thread", async () => {
    subjectsClient.listByConversationIds.mockResolvedValue([makeStoredSubject(), threadSubject()]);

    await makeClient().recordSlackThreadStatusMessage(MESSAGE);

    expect(subjectsClient.listByConversationIds).toHaveBeenCalledWith(['inv-1']);
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      {
        type: 'slack_thread',
        id: THREAD_KEY,
        slack: { channel: 'C1', thread_ts: '1.1', status_message_ts: '1.2' },
      },
    ]);
  });

  it('keeps a status message the thread already has', async () => {
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ status_message_ts: '1.0' }),
    ]);

    await makeClient().recordSlackThreadStatusMessage(MESSAGE);

    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('records nothing when the investigation is not about that thread', async () => {
    subjectsClient.listByConversationIds.mockResolvedValue([
      makeStoredSubject(),
      threadSubject({ thread_ts: '9.9' }),
    ]);

    await makeClient().recordSlackThreadStatusMessage(MESSAGE);

    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });
});

describe('NightshiftInvestigationsClient.followUpRecoveredAlert()', () => {
  const RECOVERY = {
    alertUuid: 'alert-1',
    alertId: 'service.name:checkout',
    alertStart: '2026-08-24T12:00:00.000Z',
    recoveredAt: '2026-08-24T12:15:30.000Z',
    ruleId: 'rule-1',
    ruleName: 'Latency is too high',
    ruleTypeId: 'apm.transaction_duration',
    ruleTags: ['prod'],
  };

  beforeEach(() => {
    mockManagement.getWorkflow.mockResolvedValue({
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: { steps: [], settings: { run_as: 'kibana/nightshift_agent' } },
    });
    mockManagement.runWorkflow.mockResolvedValue('exec-rec-1');
  });

  it('runs nothing when no investigation holds the alert, and traces why', async () => {
    await expect(makeClient().followUpRecoveredAlert(RECOVERY)).resolves.toBeUndefined();
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'No open investigation holds alert/alert-1; no recovery round to run'
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('runs nothing when the investigation holding the alert is closed', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-closed' }]);
    withConversations(makeConversation({ id: 'inv-closed', status: 'closed' }));

    await expect(makeClient().followUpRecoveredAlert(RECOVERY)).resolves.toBeUndefined();
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  it('runs a recovery round on the open investigation, uncharged and without new subjects', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1', status: 'open' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      { ...makeStoredSubject(), snapshot: { id: 'alert-1', reason: 'Latency spike' } },
    ]);

    await expect(makeClient().followUpRecoveredAlert(RECOVERY)).resolves.toEqual({
      investigation_id: 'inv-1',
      execution_id: 'exec-rec-1',
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Requested a recovery round on investigation "inv-1" for alert/alert-1, execution_id=exec-rec-1'
    );

    expect(agenticInvestigationsClient.findOpenBySubjects).toHaveBeenCalledWith([
      { type: 'alert', id: 'alert-1' },
    ]);
    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: BOUND_WORKFLOW_ID }),
      SPACE_ID,
      {
        investigation_id: 'inv-1',
        message: expect.stringContaining('An alert in this investigation has recovered.'),
        context: { source: 'alert', follow_up: 'alert_recovered' },
      },
      mockRequest,
      'nightshift-investigations'
    );
    const [, , { message }] = mockManagement.runWorkflow.mock.calls[0];
    expect(message).toContain('Reason: Latency spike');
    expect(message).toContain('transitioned to recovered at 2026-08-24T12:15:30.000Z');
    expect(investigationQuotaCallback).not.toHaveBeenCalled();
    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it('follows up only the most recently updated open investigation holding the alert', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([
      { id: 'inv-recent' },
      { id: 'inv-older' },
    ]);
    withConversations(
      makeConversation({ id: 'inv-older', status: 'open' }),
      makeConversation({ id: 'inv-recent', status: 'open' })
    );

    await expect(makeClient().followUpRecoveredAlert(RECOVERY)).resolves.toEqual({
      investigation_id: 'inv-recent',
      execution_id: 'exec-rec-1',
    });
    expect(mockManagement.runWorkflow).toHaveBeenCalledTimes(1);
    expect(mockManagement.runWorkflow.mock.calls[0][2]).toMatchObject({
      investigation_id: 'inv-recent',
    });
  });

  it('passes over an investigation closed since the lookup to the next open one', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([
      { id: 'inv-closed' },
      { id: 'inv-1' },
    ]);
    withConversations(
      makeConversation({ id: 'inv-closed', status: 'closed' }),
      makeConversation({ id: 'inv-1', status: 'open' })
    );

    await expect(makeClient().followUpRecoveredAlert(RECOVERY)).resolves.toMatchObject({
      investigation_id: 'inv-1',
    });
    expect(mockManagement.runWorkflow).toHaveBeenCalledTimes(1);
  });

  it("briefs from the recovered alert's own snapshot, not from another subject", async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1', status: 'open' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      {
        ...makeStoredSubject({ subjectId: 'alert-2' }),
        snapshot: { id: 'alert-2', reason: 'Disk is full' },
      },
    ]);

    await makeClient().followUpRecoveredAlert(RECOVERY);

    expect(subjectsClient.listByConversationIds).toHaveBeenCalledWith(['inv-1']);
    const [, , { message }] = mockManagement.runWorkflow.mock.calls[0];
    expect(message).not.toContain('Disk is full');
    expect(message).not.toContain('Reason:');
  });

  it("runs the space's entry point as it is stored, without a timeout override", async () => {
    const stored = {
      id: BOUND_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: { steps: [], settings: { run_as: 'kibana/nightshift_agent', timeout: '60m' } },
    };
    mockManagement.getWorkflow.mockResolvedValue(stored);
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1', status: 'open' }));

    await makeClient().followUpRecoveredAlert(RECOVERY);

    expect(mockManagement.getWorkflow).toHaveBeenCalledWith(
      BOUND_WORKFLOW_ID,
      SPACE_ID,
      mockRequest
    );
    expect(mockManagement.runWorkflow.mock.calls[0][0]).toEqual(stored);
  });

  it('fails without reporting a round when the investigation workflow is not installed', async () => {
    mockManagement.getWorkflow.mockResolvedValue(undefined);
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1', status: 'open' }));

    await expect(makeClient().followUpRecoveredAlert(RECOVERY)).rejects.toThrow(
      InvestigationUnavailableError
    );
    expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('fails without reporting a round when the round cannot be run', async () => {
    mockManagement.runWorkflow.mockRejectedValue(new Error('Task Manager is unavailable'));
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-1' }]);
    withConversations(makeConversation({ id: 'inv-1', status: 'open' }));

    await expect(makeClient().followUpRecoveredAlert(RECOVERY)).rejects.toThrow(
      'Task Manager is unavailable'
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('refuses while investigations are unavailable', async () => {
    await expect(
      makeClient({
        isInfrastructureAvailable: jest.fn().mockResolvedValue(false),
      }).followUpRecoveredAlert(RECOVERY)
    ).rejects.toThrow(InvestigationUnavailableError);
    expect(agenticInvestigationsClient.findOpenBySubjects).not.toHaveBeenCalled();
  });
});

describe('NightshiftInvestigationsClient.claimSlackThread()', () => {
  const THREAD = {
    investigationId: 'inv-1',
    externalConversationId: 'slack:T1:C1:1.1',
    channel: 'C1',
    threadTs: '1.1',
  };

  it('claims the thread and records it on the investigation', async () => {
    await expect(makeClient().claimSlackThread(THREAD)).resolves.toBe(true);

    expect(subjectsClient.claimSubjects).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'inv-1',
        subjects: [{ type: 'slack_thread', id: 'slack:T1:C1:1.1' }],
      })
    );
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      {
        type: 'slack_thread',
        id: 'slack:T1:C1:1.1',
        slack: { channel: 'C1', thread_ts: '1.1' },
      },
    ]);
  });

  it('leaves a thread another investigation holds with that investigation', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-2' });

    await expect(makeClient().claimSlackThread(THREAD)).resolves.toBe(false);

    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });
});
