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
  createConversationAlreadyExistsError,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import {
  NIGHTSHIFT_DEFAULT_MODELS,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import { freeFormContextSchema } from '../../common/schemas';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import type {
  FindInvestigationsResult,
  InvestigationAttributes,
  InvestigationRecord,
  InvestigationRepository,
} from '../storage';
import { InvestigationStaleWriteError } from '../storage';
import {
  InvestigationConflictError,
  InvalidInvestigationContextError,
  InvestigationNotFoundError,
  InvestigationQuotaDeniedError,
  InvestigationUnavailableError,
} from './errors';
import { NightshiftInvestigationsClient } from './investigations_client';

jest.mock('../lib/install_investigation_agent', () => ({
  installInvestigationAgent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('uuid', () => ({ ...jest.requireActual('uuid'), v4: () => 'inv-new' }));

const installInvestigationAgentMock = installInvestigationAgent as jest.MockedFunction<
  typeof installInvestigationAgent
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
  getByOrigin: jest.fn(),
  patchMetadata: jest.fn(),
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
const agenticInvestigationsClient = { findOpenBySubjects: jest.fn() };

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
  username = 'automation',
  templateId = 'investigation',
}: {
  id: string;
  title?: string;
  status?: 'open' | 'closed';
  owner?: boolean;
  username?: string;
  templateId?: string;
}) => ({
  id,
  title,
  user: { username },
  template_id: templateId,
  metadata: status ? { status } : {},
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
    slack: Record<string, string>;
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

let repository: jest.Mocked<InvestigationRepository>;

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
    investigationRepository: repository,
    inference: mockInference,
    savedObjects: mockSavedObjects,
    uiSettings: mockUiSettings,
    isAvailable: jest.fn().mockResolvedValue(true),
    isInfrastructureAvailable: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

const makeAttrs = (overrides: Partial<InvestigationAttributes> = {}): InvestigationAttributes => ({
  title: 'Latency is too high',
  status: 'completed',
  subject_type: 'alert',
  subject_id: 'alert-42',
  trigger_type: 'automatic',
  concurrency_key: undefined,
  executed_by: 'test-user',
  created_at: '2024-01-01T00:00:00Z',
  started_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T01:00:00Z',
  summary: 'All clear.',
  conclusion: 'No issues found.',
  hypotheses: [{ candidate: 'h1', confidence: 0.9, status: 'confirmed' }],
  recommendations: [{ title: 'Keep monitoring', confidence: 0.7 }],
  ...overrides,
});

const makeRecord = (
  overrides: Partial<InvestigationAttributes> = {},
  { id = 'inv-1', version = '1' }: { id?: string; version?: string } = {}
): InvestigationRecord => ({
  id,
  version,
  ...makeAttrs(overrides),
});

const findResult = (records: InvestigationRecord[]): FindInvestigationsResult => ({
  results: records,
  page: 1,
  size: 20,
  total: records.length,
});

const createMockRepository = (): jest.Mocked<InvestigationRepository> => ({
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  find: jest.fn().mockResolvedValue(findResult([])),
});

beforeEach(() => {
  jest.clearAllMocks();
  installInvestigationAgentMock.mockResolvedValue(undefined);
  investigationQuotaCallback.mockResolvedValue({ allowed: true });
  getSetting.mockResolvedValue(false);
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
  repository = createMockRepository();
  withConversations();
  // Like Agent Builder, a conversation created without a title carries the placeholder.
  conversations.create.mockImplementation(async ({ id, title }: { id: string; title?: string }) =>
    makeConversation({ id, title: title ?? DEFAULT_CONVERSATION_TITLE })
  );
  conversations.getByOrigin.mockResolvedValue(undefined);
  conversations.patchMetadata.mockResolvedValue({ conversation: {}, changedFields: ['status'] });
  subjectsClient.upsertSubjects.mockResolvedValue([]);
  subjectsClient.findConversationIdsBySubjects.mockResolvedValue([]);
  subjectsClient.listByConversationIds.mockResolvedValue([]);
  subjectsClient.claimSubjects.mockResolvedValue({ claimed: true });
  agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([]);
});

describe('NightshiftInvestigationsClient.get()', () => {
  it('throws InvestigationNotFoundError when the record does not exist', async () => {
    await expect(makeClient().get('inv-123')).rejects.toThrow(InvestigationNotFoundError);
  });

  it('returns full structured output from the store', async () => {
    repository.get.mockResolvedValue(
      makeRecord({
        conversation_id: 'conv-1',
        impact: { entities: [{ name: 'checkout-service' }] },
      })
    );
    const result = await makeClient().get('inv-1');

    expect(result).toEqual({
      investigation_id: 'inv-1',
      title: 'Latency is too high',
      subject: { type: 'alert', id: 'alert-42' },
      trigger_type: 'automatic',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T01:00:00Z',
      concurrency_key: undefined,
      executed_by: 'test-user',
      error: undefined,
      summary: 'All clear.',
      conclusion: 'No issues found.',
      severity: undefined,
      hypotheses: [{ candidate: 'h1', confidence: 0.9, status: 'confirmed' }],
      recommendations: [{ title: 'Keep monitoring', confidence: 0.7 }],
      conversation_id: 'conv-1',
      impact: { entities: [{ name: 'checkout-service' }] },
    });
  });

  it('omits historical recommendations without confidence and legacy blind spots', async () => {
    repository.get.mockResolvedValue({
      ...makeRecord(),
      recommendations: [{ title: 'Keep monitoring' }],
      blind_spots: [{ title: 'Blind spot', confidence: 0.6, description: 'desc' }],
    } as unknown as InvestigationRecord);

    const result = await makeClient().get('inv-1');

    expect(result.summary).toBe('All clear.');
    expect(result.recommendations).toBeUndefined();
    expect(result).not.toHaveProperty('blind_spots');
  });

  it('returns subject.summary from the stored subject_summary attribute', async () => {
    const long = `${'x'.repeat(400)} and a trailing clause that must not be cut mid-sentence.`;
    repository.get.mockResolvedValue(
      makeRecord({
        subject_type: 'significant_event',
        subject_id: 'event-42',
        subject_summary: long,
      })
    );

    const result = await makeClient().get('inv-1');

    expect(result.subject).toEqual({
      type: 'significant_event',
      id: 'event-42',
      summary: long,
    });
  });

  it('omits subject.summary when subject_summary is absent', async () => {
    repository.get.mockResolvedValue(makeRecord());
    const result = await makeClient().get('inv-1');
    expect(result.subject).toEqual({ type: 'alert', id: 'alert-42' });
  });

  it('returns the stored running status without consulting the workflow engine', async () => {
    repository.get.mockResolvedValue(makeRecord({ status: 'running', completed_at: undefined }));

    const result = await makeClient().get('inv-1');

    expect(result.status).toBe('running');
    expect(mockManagement.getWorkflowExecution).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns the stored started_at', async () => {
    repository.get.mockResolvedValue(
      makeRecord({ started_at: '2024-01-01T00:05:00Z', created_at: '2024-01-01T00:00:00Z' })
    );

    const result = await makeClient().get('inv-1');

    expect(result.started_at).toBe('2024-01-01T00:05:00Z');
  });

  it('returns created_at with started_at unset for a pending record', async () => {
    repository.get.mockResolvedValue(
      makeRecord({
        status: 'pending',
        started_at: undefined,
        completed_at: undefined,
        created_at: '2024-01-01T00:00:00Z',
      })
    );

    const result = await makeClient().get('inv-1');

    expect(result.status).toBe('pending');
    expect(result.created_at).toBe('2024-01-01T00:00:00Z');
    expect(result.started_at).toBeUndefined();
  });

  it('returns the stored severity', async () => {
    repository.get.mockResolvedValue(makeRecord({ severity: '60-high' }));
    const result = await makeClient().get('inv-1');
    expect(result.severity).toBe('60-high');
  });

  it('leaves severity unset when the record has none', async () => {
    repository.get.mockResolvedValue(makeRecord());
    const result = await makeClient().get('inv-1');
    expect(result.severity).toBeUndefined();
  });
});

describe('NightshiftInvestigationsClient.list()', () => {
  it('uses default page=1 and perPage=20', async () => {
    await makeClient().list();
    expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({ page: 1, perPage: 20 }));
  });

  it('passes statuses filter', async () => {
    await makeClient().list({ statuses: ['running', 'completed'] });
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['running', 'completed'] })
    );
  });

  it('passes sort_field=completed_at through as sortField', async () => {
    await makeClient().list({ sort_field: 'completed_at' });
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ sortField: 'completed_at' })
    );
  });

  it('maps started_* filters onto started_at, leaving created_at unfiltered', async () => {
    await makeClient().list({
      started_after: '2024-01-01T00:00:00Z',
      started_before: '2024-01-31T00:00:00Z',
    });
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        startedAfter: '2024-01-01T00:00:00Z',
        startedBefore: '2024-01-31T00:00:00Z',
        createdAfter: undefined,
        createdBefore: undefined,
      })
    );
  });

  it('maps created_* filters onto created_at so pending runs are matchable', async () => {
    await makeClient().list({
      created_after: '2024-01-01T00:00:00Z',
      created_before: '2024-01-31T00:00:00Z',
    });
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAfter: '2024-01-01T00:00:00Z',
        createdBefore: '2024-01-31T00:00:00Z',
        startedAfter: undefined,
        startedBefore: undefined,
      })
    );
  });

  it('maps concurrency_key onto the stored investigation filter', async () => {
    await makeClient().list({ concurrency_key: 'alert-1' });
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ concurrencyKey: 'alert-1' })
    );
  });

  it('omits sortField when sort_field is not given so the store default applies', async () => {
    await makeClient().list({});
    expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({ sortField: undefined }));
  });

  it('returns a slim list item without structured output', async () => {
    repository.find.mockResolvedValue(
      findResult([makeRecord({ concurrency_key: 'key-1' }, { id: 'inv-42' })])
    );

    const result = await makeClient().list({});
    expect(result.results[0]).toEqual({
      investigation_id: 'inv-42',
      title: 'Latency is too high',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
      started_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T01:00:00Z',
      severity: undefined,
      concurrency_key: 'key-1',
      executed_by: 'test-user',
      subject: { type: 'alert', id: 'alert-42' },
      // Rendered by the list row: the AI headline and the entity chips.
      summary: 'All clear.',
      impact: undefined,
    });
    expect(result.results[0]).not.toHaveProperty('trigger_type');
    expect(result.results[0]).not.toHaveProperty('error');
    expect(result.results[0]).not.toHaveProperty('conclusion');
    expect(result.results[0]).not.toHaveProperty('hypotheses');
    expect(result.results[0]).not.toHaveProperty('recommendations');
    expect(result.results[0]).not.toHaveProperty('blind_spots');
    expect(result.results[0]).not.toHaveProperty('conversation_id');
  });

  it('returns stored running items without consulting the workflow engine', async () => {
    repository.find.mockResolvedValue(
      findResult([
        makeRecord({ status: 'running', completed_at: undefined }, { id: 'inv-running' }),
      ])
    );

    const result = await makeClient().list({});

    expect(result.results[0].status).toBe('running');
    expect(mockManagement.getWorkflowExecution).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns severity on list items when stored', async () => {
    repository.find.mockResolvedValue(
      findResult([makeRecord({ severity: '80-critical' }, { id: 'inv-42' })])
    );

    const result = await makeClient().list({});
    expect(result.results[0].severity).toBe('80-critical');
  });
});

describe('NightshiftInvestigationsClient.start()', () => {
  const WORKFLOW_ID = NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID;
  const mockWorkflow = { id: WORKFLOW_ID, enabled: true, valid: true, definition: { steps: [] } };

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

  it('starts manual runs on the Nightshift investigation workflow', async () => {
    const investigationWorkflow = {
      id: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: { steps: [] },
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
      NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      SPACE_ID,
      mockRequest
    );
    expect(installInvestigationAgentMock).toHaveBeenCalledWith({
      agentBuilder: mockAgentBuilder,
      spaceId: SPACE_ID,
      availability: mockAgentAvailability,
    });
    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID }),
      SPACE_ID,
      expect.objectContaining({
        message: 'Why did payment timeouts increase?',
        context: expect.objectContaining({ source: 'manual', manual_id: 'manual' }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
    expect(result).toEqual({ investigation_id: 'inv-new' });
  });

  it('labels a manual run with its prompt so it does not read as "manual" while running', async () => {
    mockManagement.getWorkflow.mockResolvedValue({
      id: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: { steps: [] },
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
      id: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: { steps: [] },
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
      id: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
      enabled: true,
      valid: true,
      definition: { steps: [] },
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

  it('uses the caller-supplied message and stream_names when provided', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-789');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'se-1' },
      trigger_type: 'manual',
      message: 'Checkout latency breach\n\nP99 latency climbed above 2s.',
      stream_names: ['logs.checkout'],
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('Checkout latency breach\n\nP99 latency climbed above 2s.');
    expect(inputs.stream_names).toEqual(['logs.checkout']);
  });

  // Uses a significant event subject: an alert investigation cannot reach the generic fallback
  // any more, because it is rejected without the alert data the brief is composed from.
  it('falls back to a generic message and empty stream_names when omitted', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-999');

    await makeClient().start({
      title: 'Latency is too high',
      subject: { type: 'significant_event', id: 'se-1' },
      trigger_type: 'manual',
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('Investigation requested for significant_event se-1');
    expect(inputs.stream_names).toEqual([]);
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
    expect(subjectsClient.claimSubjects).not.toHaveBeenCalled();
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
      investigationRepository: repository,
      inference: mockInference,
      savedObjects: mockSavedObjects,
      uiSettings: mockUiSettings,
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
    it.each([['event_uuid'], ['stream_names'], ['source']])(
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

describe('NightshiftInvestigationsClient.update()', () => {
  beforeEach(() => {
    repository.get.mockResolvedValue(makeRecord({ status: 'running', completed_at: undefined }));
  });

  it('throws InvestigationNotFoundError when the investigation does not exist', async () => {
    repository.get.mockResolvedValue(undefined);

    await expect(makeClient().update('inv-missing', { status: 'completed' })).rejects.toThrow(
      InvestigationNotFoundError
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('is an idempotent no-op when replaying the same terminal status', async () => {
    repository.get.mockResolvedValue(makeRecord({ status: 'completed' }));

    await expect(
      makeClient().update('inv-1', { status: 'completed', summary: 'Replayed.' })
    ).resolves.toBeUndefined();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws InvestigationConflictError when moving a settled investigation back to running', async () => {
    repository.get.mockResolvedValue(makeRecord({ status: 'completed' }));

    await expect(makeClient().update('inv-1', { status: 'running' })).rejects.toThrow(
      InvestigationConflictError
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws InvestigationConflictError when changing one terminal status to another', async () => {
    repository.get.mockResolvedValue(makeRecord({ status: 'cancelled' }));

    await expect(makeClient().update('inv-1', { status: 'failed' })).rejects.toThrow(
      InvestigationConflictError
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('persists the provided error when status is failed', async () => {
    await makeClient().update('inv-1', {
      status: 'failed',
      error: 'Agent timed out.',
    });

    expect(repository.update).toHaveBeenCalledWith({
      id: 'inv-1',
      patch: expect.objectContaining({ status: 'failed', error: 'Agent timed out.' }),
      version: '1',
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Agent timed out.'));
  });

  it('persists a generic error when status is failed and no error is provided', async () => {
    await makeClient().update('inv-1', { status: 'failed' });

    expect(repository.update).toHaveBeenCalledWith({
      id: 'inv-1',
      patch: expect.objectContaining({ status: 'failed', error: 'Investigation failed' }),
      version: '1',
    });
  });

  it('does not persist an error field when status is completed', async () => {
    await makeClient().update('inv-1', {
      status: 'completed',
      summary: 'All clear.',
    });

    expect(repository.update).toHaveBeenCalledWith({
      id: 'inv-1',
      patch: expect.objectContaining({ status: 'completed', summary: 'All clear.' }),
      version: '1',
    });
    const { patch } = repository.update.mock.calls[0][0];
    expect(patch).not.toHaveProperty('error');
  });

  it('persists conversation_id and impact', async () => {
    await makeClient().update('inv-1', {
      status: 'completed',
      conversation_id: 'conv-1',
      impact: { entities: [{ name: 'checkout-service' }] },
    });

    expect(repository.update).toHaveBeenCalledWith({
      id: 'inv-1',
      patch: expect.objectContaining({
        status: 'completed',
        conversation_id: 'conv-1',
        impact: { entities: [{ name: 'checkout-service' }] },
      }),
      version: '1',
    });
  });

  it('writes with the version it read and maps a concurrent-write conflict to InvestigationConflictError', async () => {
    repository.update.mockRejectedValue(new InvestigationStaleWriteError('inv-1'));

    await expect(makeClient().update('inv-1', { status: 'completed' })).rejects.toThrow(
      InvestigationConflictError
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith({
      id: 'inv-1',
      patch: expect.objectContaining({ status: 'completed' }),
      version: '1',
    });
  });
});

describe('NightshiftInvestigationsClient.start() on investigations', () => {
  const mockWorkflow = {
    id: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
    enabled: true,
    valid: true,
    definition: { steps: [] },
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

  it('leaves every write to the workflow: the start only reads, claims, and runs', async () => {
    await expect(startAlerts('alert-1', 'alert-2')).resolves.toEqual({
      investigation_id: 'inv-new',
    });

    expect(conversations.create).not.toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
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

  it('opens a new investigation rather than continue one owned by another identity', async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-theirs' }]);
    withConversations(makeConversation({ id: 'inv-theirs', owner: false }));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-new' });
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('inv-theirs'));
    expect(runInputs().message).not.toContain('This continues the investigation');
  });

  it("continues an investigation owned by the caller's username when profile ids differ", async () => {
    agenticInvestigationsClient.findOpenBySubjects.mockResolvedValue([{ id: 'inv-mine' }]);
    withConversations(makeConversation({ id: 'inv-mine', owner: false, username: 'automation' }));

    await expect(
      makeClient({ getCallerUsername: () => 'automation' }).start({
        title: 'Latency is too high',
        subject: { type: 'alert', id: 'alert-1' },
        trigger_type: 'automatic',
        context: { alerts: [makeAlert('alert-1')] },
      })
    ).resolves.toEqual({ investigation_id: 'inv-mine' });
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

  it('is not blocked by a claim held by an investigation it cannot write', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-theirs' });
    withConversations(makeConversation({ id: 'inv-theirs', owner: false }));

    await expect(startAlerts('alert-1')).resolves.toEqual({ investigation_id: 'inv-new' });
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
      id: 'exec-1',
      workflowId,
      status,
      context: { inputs },
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
    });
    // A conversation this call created holds no subjects yet.
    expect(subjectsClient.listByConversationIds).not.toHaveBeenCalled();
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', subjects);
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

    expect(conversations.patchMetadata).toHaveBeenCalledWith('inv-1', { status: 'open' });
  });

  it('writes nothing to an investigation the run does not own', async () => {
    withExecution();
    withConversations(makeConversation({ id: 'inv-1', status: 'closed', owner: false }));

    await expect(makeClient().ensureOrCreate('inv-1', 'exec-1')).resolves.toBe('inv-1');

    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('does not own'));
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
  const THREAD_KEY = 'team:T1/channel:C1/thread:1712345678.000100';
  const threadSubject = (slack: Record<string, string> = {}) =>
    makeStoredSubject({
      subjectType: 'slack_thread',
      subjectId: THREAD_KEY,
      slack: { channel: 'C1', thread_ts: THREAD.threadTs, ...slack },
    });

  it('finds the investigation by the thread conversation origin', async () => {
    conversations.getByOrigin.mockResolvedValue({ id: 'inv-1', template_id: 'investigation' });
    withConversations(makeConversation({ id: 'inv-1', title: 'Checkout is slow' }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      threadSubject({ status_message_ts: '1712345679.000200' }),
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toEqual({
      investigation_id: 'inv-1',
      title: 'Checkout is slow',
      slack_message_ts: '1712345679.000200',
    });
    expect(conversations.getByOrigin).toHaveBeenCalledWith({
      external_conversation_id: THREAD_KEY,
    });
    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
  });

  it("falls back to the thread's subject when the origin names another conversation", async () => {
    conversations.getByOrigin.mockResolvedValue({ id: 'chat-1', template_id: undefined });
    subjectsClient.findConversationIdsBySubjects.mockResolvedValue(['inv-1']);
    withConversations(makeConversation({ id: 'inv-1' }));

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toMatchObject({ investigation_id: 'inv-1' });
    expect(subjectsClient.findConversationIdsBySubjects).toHaveBeenCalledWith([
      { type: 'slack_thread', id: THREAD_KEY },
    ]);
  });

  it("headlines an investigation Agent Builder has not titled yet with the thread's question", async () => {
    conversations.getByOrigin.mockResolvedValue({ id: 'inv-1', template_id: 'investigation' });
    withConversations(makeConversation({ id: 'inv-1', title: DEFAULT_CONVERSATION_TITLE }));
    subjectsClient.listByConversationIds.mockResolvedValue([
      { ...threadSubject(), summary: 'why is checkout slow?' },
    ]);

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toEqual({ investigation_id: 'inv-1', title: 'why is checkout slow?' });
  });

  it('records a new status message on the thread subject', async () => {
    conversations.getByOrigin.mockResolvedValue({ id: 'inv-1', template_id: 'investigation' });
    withConversations(makeConversation({ id: 'inv-1', status: 'closed' }));
    subjectsClient.listByConversationIds.mockResolvedValue([threadSubject()]);

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false, slackMessageTs: '2.0' })
    ).resolves.toMatchObject({ slack_message_ts: '2.0' });
    expect(subjectsClient.upsertSubjects).toHaveBeenCalledWith('inv-1', [
      {
        type: 'slack_thread',
        id: THREAD_KEY,
        slack: { channel: 'C1', thread_ts: THREAD.threadTs, status_message_ts: '2.0' },
      },
    ]);
  });

  it('does not write the status message to an investigation another identity owns', async () => {
    conversations.getByOrigin.mockResolvedValue({ id: 'inv-1', template_id: 'investigation' });
    withConversations(makeConversation({ id: 'inv-1', owner: false }));

    await makeClient().findOrCreateSlackThread({ ...THREAD, create: false, slackMessageTs: '2.0' });

    expect(subjectsClient.upsertSubjects).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('does not create an investigation for a thread without create', async () => {
    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: false })
    ).resolves.toBeUndefined();
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('creates the investigation with the thread origin and the thread as its subject', async () => {
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
      accessControl: { access_mode: 'public' },
      origin: { external_conversation_id: THREAD_KEY },
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

  it('agrees with a concurrent create for the same thread', async () => {
    subjectsClient.claimSubjects.mockResolvedValue({ claimed: false, heldBy: 'inv-first' });

    await expect(
      makeClient().findOrCreateSlackThread({ ...THREAD, create: true, text: 'hello' })
    ).resolves.toMatchObject({ investigation_id: 'inv-first' });
    expect(conversations.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv-first' }));
  });

  it('keys a thread without a workspace by channel and thread', async () => {
    await makeClient().findOrCreateSlackThread({ channel: 'C1', threadTs: '1.0', create: false });

    expect(conversations.getByOrigin).toHaveBeenCalledWith({
      external_conversation_id: 'channel:C1/thread:1.0',
    });
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

  it('reports a Slack thread as a manual subject, after any other subject', async () => {
    subjectsClient.listByConversationIds.mockResolvedValue([
      makeStoredSubject({ subjectType: 'slack_thread', subjectId: 'team:T/channel:C/thread:1' }),
    ]);

    await expect(makeClient().getLifecycleSubject('inv-1')).resolves.toMatchObject({
      subject: { type: 'manual', id: 'team:T/channel:C/thread:1' },
      triggerType: 'manual',
    });
  });

  it('returns undefined for an investigation without subjects', async () => {
    await expect(makeClient().getLifecycleSubject('inv-1')).resolves.toBeUndefined();
  });
});
