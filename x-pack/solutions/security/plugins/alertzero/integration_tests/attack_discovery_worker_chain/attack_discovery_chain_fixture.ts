/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import YAML from 'yaml';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import { ExecutionStatus } from '@kbn/workflows';
import type { Proposal } from '@kbn/proposals-common';
import { ProposalsService } from '@kbn/proposals-plugin/server/services/proposals_service';
import type {
  ProposalDocument,
  ProposalsStorageClient,
} from '@kbn/proposals-plugin/server/storage/proposals_storage';
import type { ProposalPrivilegesChecker } from '@kbn/proposals-plugin/server/services/check_proposal_privileges';
import { getCheckDecidePrivilegesStepDefinition } from '@kbn/proposals-plugin/server/step_types/check_decide_privileges_step';
import { getCloneProposalStepDefinition } from '@kbn/proposals-plugin/server/step_types/clone_proposal_step';
import { getCreateProposalStepDefinition } from '@kbn/proposals-plugin/server/step_types/create_proposal_step';
import { getGetLatestRevisionStepDefinition } from '@kbn/proposals-plugin/server/step_types/get_latest_revision_step';
import { getGetProposalStepDefinition } from '@kbn/proposals-plugin/server/step_types/get_proposal_step';
import { getUpdateProposalStepDefinition } from '@kbn/proposals-plugin/server/step_types/update_proposal_step';
import {
  CHAIN_WORKFLOW_ID_LIST,
  CHAIN_WORKFLOW_IDS,
  driveChain,
  managedWorkflowDocumentSource,
  managedWorkflowYaml,
  requestedWorkflowId,
} from './chain_plumbing_helpers';
import { createFakeAlertZeroBackend } from './chain_step_registry';
import { installKibanaRequestFake, withFakeAuthorizationHeader } from './kibana_request_fake';

/** Deterministic per-attack ids the review's UUIDv8 derivation would otherwise
 * compute from a hash — the suite pins its own so assertions can key on it
 * directly rather than re-deriving the same hash the workflow does. */
export const FAKE_ATTACK_DISCOVERY_ID = 'fake-attack-discovery-id';
export const FAKE_INVESTIGATION_ID = 'fake-investigation-id-0000-0000-0000-000000000000';
export const FAKE_REVIEW_EXECUTION_ID = 'fake_workflow_execution_id';

/** The gate's literal `timeout` (`system-create-proposal`'s `settings.timeout`
 * is `168h`, but the HITL decision window inside it — the loop's own
 * per-park deadline — is 72h; same constant `proposal_gate_fixture.ts` uses. */
const GATE_TIMEOUT_MS = 72 * 60 * 60 * 1000;

/**
 * Elasticsearch replaced by a Map for both backing stores the chain reads
 * during a run: the persisted Attack Discovery document `load_attack_discovery`
 * reads in `attack_discovery_fp_tp_analysis.yaml`, and the proposals index the
 * escalation gate writes through the REAL `ProposalsService`.
 */
const createInMemoryProposalsStorage = () => {
  const documents = new Map<string, { document: ProposalDocument; seqNo: number }>();
  let seqNo = 0;

  type Clause = Record<string, any>;
  const matchesClause = (id: string, document: ProposalDocument, clause: Clause): boolean => {
    if (clause.ids) {
      return (clause.ids.values as string[]).includes(id);
    }
    if (clause.term) {
      const [field, value] = Object.entries(clause.term)[0] as [string, unknown];
      return (document as unknown as Record<string, unknown>)[field] === value;
    }
    if (clause.exists) {
      const field = clause.exists.field as string;
      return (document as unknown as Record<string, unknown>)[field] !== undefined;
    }
    throw new Error(`createInMemoryProposalsStorage: unsupported clause ${JSON.stringify(clause)}`);
  };

  return {
    documents,
    client: {
      index: jest.fn(async ({ id, document }: { id: string; document: ProposalDocument }) => {
        documents.set(id, { document, seqNo: (seqNo += 1) });
        return { _id: id };
      }),
      search: jest.fn(async ({ query }: { query: unknown }) => {
        const bool = (query as { bool?: { filter?: Clause[]; must_not?: Clause[] } })?.bool ?? {};
        const filter = bool.filter ?? [];
        const mustNot = bool.must_not ?? [];
        const hits = [...documents.entries()]
          .filter(
            ([id, { document }]) =>
              filter.every((clause) => matchesClause(id, document, clause)) &&
              mustNot.every((clause) => !matchesClause(id, document, clause))
          )
          .map(([id, { document, seqNo: docSeqNo }]) => ({
            _id: id,
            _source: document,
            _seq_no: docSeqNo,
            _primary_term: 1,
          }));
        return { hits: { hits, total: { value: hits.length } } };
      }),
    } as unknown as ProposalsStorageClient,
  };
};

export interface AttackDiscoveryChainFixture {
  engine: WorkflowRunFixture;
  backend: ReturnType<typeof createFakeAlertZeroBackend>['backend'];
  proposals: () => Array<Proposal & { id: string }>;
  onlyProposal: () => Proposal & { id: string };
  /** Persists the `.alerts-security.attack.discovery.alerts-<space>` document
   * `load_attack_discovery` reads, matching the real field names the AD Worker
   * writes (`kibana.alert.attack_discovery.*`). */
  seedAttackDiscoveryDocument: (overrides?: Record<string, unknown>) => void;
  /** Runs the review workflow (the chain's entry point) to its first park or to
   * completion, resolving every nested `workflow.execute` child through the
   * SAME shared repository. */
  runReview: (inputs?: Record<string, unknown>) => Promise<void>;
  /** Answers the escalation gate as an analyst would, then drives the chain to
   * settle. */
  resumeEscalationGate: (decision: {
    approved: boolean;
    respondedBy?: string;
    dismissReason?: string;
    rationale?: string;
  }) => Promise<void>;
  /** Wakes the parked escalation gate past its 72h decision deadline with no
   * answer — what the scheduled wake task does in production, per the review's
   * own `176h` workflow timeout comment (the gate has to settle before that
   * fires). Proves the review's escalation-gate branch handles an expired
   * proposal, using the SAME fake-timers pattern `proposal_gate_fixture.
   * timeOutGate()` already proves at the gate-workflow level. */
  timeOutEscalationGate: () => Promise<void>;
  reviewExecution: () => Record<string, any> | undefined;
  reviewOutput: () => Record<string, unknown> | undefined;
  setCanDecide: (canDecide: boolean) => void;
}

export const createAttackDiscoveryChainFixture = (): AttackDiscoveryChainFixture => {
  const engine = new WorkflowRunFixture();
  const { backend, stepDefinitions: alertZeroStepDefinitions } = createFakeAlertZeroBackend();
  const { documents: proposalDocuments, client: proposalsStorageClient } =
    createInMemoryProposalsStorage();
  let canDecide = true;

  Object.assign(engine.fakeKibanaRequest, withFakeAuthorizationHeader(engine.fakeKibanaRequest));

  const workflowsApi = {
    // The escalation gate's own `getWorkflow` lookup, for the action's declared
    // metadata (category/impact/approvalPolicy). The forensics handoff action
    // declares `approvalPolicy: autonomy-dependent`, which is what lets
    // `autoApprove` (this review's `supervised` autonomy) actually skip the gate.
    getWorkflow: jest.fn().mockResolvedValue({
      definition: {
        consts: {
          actionMetadata: {
            name: 'Run a deep forensics investigation',
            category: 'investigate',
            impact: 'medium',
            approvalPolicy: 'autonomy-dependent',
          },
        },
      },
    }),
    getWorkflowExecution: jest.fn(),
    resumeWorkflowExecution: jest.fn(),
  };

  const proposalsService = new ProposalsService({
    storage: proposalsStorageClient,
    logger: loggerMock.create(),
    getWorkflowsApi: () => workflowsApi as never,
    getAttachmentsClient: async () => ({ create: jest.fn() } as never),
  });

  const privileges: ProposalPrivilegesChecker = {
    assertCanManage: async () => undefined,
    assertCanRead: async () => undefined,
    canManage: async () => canDecide,
  };

  const resolveUser = async () => undefined;

  const proposalStepDefinitions = [
    getCreateProposalStepDefinition({
      getProposalsService: () => proposalsService,
      resolveUser,
      privileges,
    }),
    getUpdateProposalStepDefinition({
      getProposalsService: () => proposalsService,
      resolveUser,
      privileges,
    }),
    getCheckDecidePrivilegesStepDefinition({ privileges }),
    getGetProposalStepDefinition({ getProposalsService: () => proposalsService, privileges }),
    getCloneProposalStepDefinition({ getProposalsService: () => proposalsService, privileges }),
    getGetLatestRevisionStepDefinition({ getProposalsService: () => proposalsService, privileges }),
  ];

  const byId = new Map(
    [...alertZeroStepDefinitions, ...proposalStepDefinitions].map((definition: any) => [
      definition.id,
      definition,
    ])
  );

  // Both getter and predicate: `nodes_factory` guards the custom-step lookup on
  // `hasStepDefinition` before calling `getStepDefinition`, so stubbing only the
  // getter leaves the branch unreachable and every one of these types falls
  // through to the connector path instead.
  engine.dependencies.workflowsExtensions.hasStepDefinition = jest.fn((stepType: string) =>
    byId.has(stepType)
  ) as never;
  engine.dependencies.workflowsExtensions.getStepDefinition = jest.fn((stepType: string) =>
    byId.get(stepType)
  ) as never;

  // The suite's one seam onto the REAL alertzero YAML: `workflow.execute`
  // resolves its target through `WorkflowRepository.getWorkflow`, which the
  // engine's own `setupDependencies` constructs from `coreStart.elasticsearch`.
  // Faking the ES client underneath that construction keeps the real
  // `buildWorkflowFilters` / `managedFilter` / `includeGlobal` query logic live,
  // rather than swapping the repository class the way the shared fixture already
  // mocks the execution repositories.
  const attackDiscoveryDocuments = new Map<string, Record<string, unknown>>();
  const fakeEsRequest = jest.fn(async (requestOptions: any) => {
    const body = requestOptions?.body ?? {};
    const path = requestOptions?.path ?? '';

    const workflowId = requestedWorkflowId(body?.query);
    if (workflowId && CHAIN_WORKFLOW_ID_LIST.includes(workflowId)) {
      return {
        hits: {
          hits: [{ _id: workflowId, _source: managedWorkflowDocumentSource(workflowId) }],
          total: { value: 1 },
        },
      };
    }

    // The FP/TP analysis's own required-source read of the persisted attack:
    // `elasticsearch.search` against `.alerts-security.attack.discovery.alerts-*`.
    if (typeof path === 'string' && path.includes('attack.discovery.alerts')) {
      const id = body?.query?.ids?.values?.[0];
      const doc = id ? attackDiscoveryDocuments.get(id) : undefined;
      return {
        hits: {
          hits: doc ? [{ _id: id, _source: doc }] : [],
          total: { value: doc ? 1 : 0 },
        },
      };
    }

    return { hits: { hits: [], total: { value: 0 } } };
  });
  // `WorkflowRepository.getWorkflow` (a `workflow.execute` step's target lookup)
  // reads `coreStart.elasticsearch.client.asInternalUser.search()` directly; the
  // built-in `elasticsearch.search` step type instead calls
  // `getEsClientAsUser().transport.request(...)` — `getEsClientAsUser()` is
  // `setupDependencies`' `asScoped(fakeRequest).asCurrentUser`, a DIFFERENT
  // mocked client, and it never calls `.search()` at all. Both need faking so
  // the fp/tp analysis's `load_attack_discovery` step sees the seeded document
  // through the transport path it actually goes through.
  (
    engine.dependencies.coreStart.elasticsearch.client.asInternalUser.search as jest.Mock
  ).mockImplementation(async (params: any) => fakeEsRequest({ body: params, path: '' }));
  (engine.dependencies.coreStart.elasticsearch.client.asScoped as jest.Mock).mockReturnValue({
    asCurrentUser: { transport: { request: fakeEsRequest } },
    asInternalUser: engine.dependencies.coreStart.elasticsearch.client.asInternalUser,
  });

  installKibanaRequestFake({
    getProposal: (id, spaceId) => proposalsService.get(id, spaceId),
  });

  // The chain seam: `workflow.execute`'s sync strategy calls
  // `workflowsExecutionEngine.executeWorkflow(...)` and then polls the
  // execution repository for the child's terminal status. The shared
  // `WorkflowRunFixture` supplies that method as a bare `jest.fn()`, so this is
  // what actually inserts the child's PENDING row into the SAME repository the
  // parent reads from — one engine, one repository, every execution in the
  // chain visible to every other.
  let childSequence = 0;
  const childToParent = new Map<string, string>();
  (engine.workflowsExecutionEngineMock.executeWorkflow as jest.Mock).mockImplementation(
    async (workflow: { id: string; yaml: string }, context: Record<string, unknown>) => {
      childSequence += 1;
      const childExecutionId = `${workflow.id}-child-${childSequence}`;
      const workflowDefinition = YAML.parseDocument(workflow.yaml).toJSON();
      if (typeof context.parentWorkflowExecutionId === 'string') {
        childToParent.set(childExecutionId, context.parentWorkflowExecutionId);
      }
      engine.workflowExecutionRepositoryMock.workflowExecutions.set(childExecutionId, {
        id: childExecutionId,
        spaceId: context.spaceId as string,
        workflowId: workflow.id,
        isTestRun: false,
        managed: true,
        workflowDefinition,
        context: {
          inputs: context.inputs,
          parentWorkflowId: context.parentWorkflowId,
          parentWorkflowExecutionId: context.parentWorkflowExecutionId,
          parentStepId: context.parentStepId,
          parentWorkflowInvocation: context.parentWorkflowInvocation,
        },
        status: ExecutionStatus.PENDING,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        triggeredBy: 'workflow-step',
      } as any);
      return { workflowExecutionId: childExecutionId };
    }
  );

  const proposals = () =>
    [...proposalDocuments.entries()].map(
      ([id, { document }]) => ({ id, ...document } as Proposal & { id: string })
    );

  const reviewExecution = () =>
    engine.workflowExecutionRepositoryMock.workflowExecutions.get(FAKE_REVIEW_EXECUTION_ID);

  const drive = () =>
    driveChain({
      repository: engine.workflowExecutionRepositoryMock,
      run: (id) => engine.runExistingExecution(id),
      resume: (id) => engine.resumeExecution(id),
      childToParent,
    });

  return {
    engine,
    backend,
    proposals,
    onlyProposal: () => {
      const all = proposals();
      if (all.length !== 1) {
        throw new Error(`Expected exactly one proposal, found ${all.length}`);
      }
      return all[0];
    },
    seedAttackDiscoveryDocument: (overrides = {}) => {
      attackDiscoveryDocuments.set(FAKE_ATTACK_DISCOVERY_ID, {
        'kibana.alert.uuid': FAKE_ATTACK_DISCOVERY_ID,
        'kibana.alert.attack_discovery.title': 'Suspicious lateral movement',
        'kibana.alert.attack_discovery.summary_markdown': 'Correlated alerts across two hosts.',
        'kibana.alert.attack_discovery.entity_summary_markdown': 'host-a, host-b',
        'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
        ...overrides,
      });
    },
    runReview: async (inputs = {}) => {
      await engine.runWorkflow({
        workflowYaml: managedWorkflowYaml(CHAIN_WORKFLOW_IDS.review),
        inputs: {
          attack_discovery_id: FAKE_ATTACK_DISCOVERY_ID,
          title: 'Suspicious lateral movement',
          alert_ids: ['alert-1', 'alert-2'],
          summary_markdown: 'Correlated alerts across two hosts.',
          autonomy: 'manual',
          ...inputs,
        },
      });
      await drive();
    },
    resumeEscalationGate: async ({
      approved,
      respondedBy = 'analyst',
      dismissReason,
      rationale,
    }) => {
      const gateExecution = [
        ...engine.workflowExecutionRepositoryMock.workflowExecutions.values(),
      ].find(
        (e) =>
          e.workflowId === CHAIN_WORKFLOW_IDS.gate && e.status === ExecutionStatus.WAITING_FOR_INPUT
      );
      if (!gateExecution) {
        throw new Error('resumeEscalationGate: no parked gate execution found');
      }
      gateExecution.context = {
        ...gateExecution.context,
        resumeInput: {
          approved,
          ...(dismissReason ? { dismissReason } : {}),
          ...(rationale ? { rationale } : {}),
        },
        resumedBy: respondedBy,
      };
      engine.workflowExecutionRepositoryMock.workflowExecutions.set(
        gateExecution.id,
        gateExecution
      );
      await engine.resumeExecution(gateExecution.id);
      await drive();
    },
    timeOutEscalationGate: async () => {
      const gateExecution = [
        ...engine.workflowExecutionRepositoryMock.workflowExecutions.values(),
      ].find(
        (e) =>
          e.workflowId === CHAIN_WORKFLOW_IDS.gate && e.status === ExecutionStatus.WAITING_FOR_INPUT
      );
      if (!gateExecution) {
        throw new Error('timeOutEscalationGate: no parked gate execution found');
      }
      // No `resumeInput`, exactly like `proposal_gate_fixture.timeOutGate()`: the
      // gate's `waitForApproval` step reads the wait as expired past its 72h
      // deadline and fails itself with a `TimeoutError`, which the shared gate
      // workflow's own step-level `on-failure` settles as `status: expired`.
      jest.useFakeTimers({ now: new Date(Date.now() + GATE_TIMEOUT_MS + 60_000) });
      try {
        await engine.resumeExecution(gateExecution.id);
      } finally {
        jest.useRealTimers();
      }
      await drive();
    },
    reviewExecution,
    reviewOutput: () => {
      const steps = [...engine.stepExecutionRepositoryMock.stepExecutions.values()].filter(
        (step) => step.workflowRunId === FAKE_REVIEW_EXECUTION_ID && step.stepId === 'emit_result'
      );
      return steps[steps.length - 1]?.output as Record<string, unknown> | undefined;
    },
    setCanDecide: (value) => {
      canDecide = value;
    },
  };
};
