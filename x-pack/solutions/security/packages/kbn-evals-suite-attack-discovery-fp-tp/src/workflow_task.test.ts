/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { TerminalExecutionStatuses, type WorkflowStepExecutionDto } from '@kbn/workflows';

import {
  buildAttackDiscoveryFromPayload,
  deriveInvestigationId,
  normalizeVerdictLabel,
  readAgentVerdict,
  readWorkflowOutput,
  runAttackDiscoveryWorkflow,
  seedAttackDiscovery,
  seedInvestigation,
} from './workflow_task';

const agentStep = (overrides: Partial<WorkflowStepExecutionDto>): WorkflowStepExecutionDto =>
  ({
    stepId: 'runAgent_step',
    stepType: 'ai.agent',
    output: null,
    status: 'completed',
    ...overrides,
  } as WorkflowStepExecutionDto);

interface CallRecord {
  url: string;
  method?: string;
  body: Record<string, unknown>;
}

const AD_DOC_ID = 'a'.repeat(8) + 'b'.repeat(4) + 'c'.repeat(4) + 'd'.repeat(4) + 'e'.repeat(12);

/** Mock fetch routing for the full bridge: seed AD → seed conversation → run → poll. */
const bridgeFetch = ({
  adDoc = { id: AD_DOC_ID, title: 't' },
  runResponse = { workflowExecutionId: 'exec-1' },
  execution,
  calls = [] as CallRecord[],
}: {
  adDoc?: { id: string; title?: string };
  runResponse?: { workflowExecutionId: string };
  execution?: unknown;
  calls?: CallRecord[];
}) =>
  (async (url: string, init?: RequestInit) => {
    const body = init?.body
      ? (JSON.parse(init.body as string) as Record<string, unknown>)
      : ({} as Record<string, unknown>);
    calls.push({ url, method: init?.method, body });
    if (url === '/internal/elastic_assistant/data_generator/attack_discoveries/_create') {
      return { data: [adDoc] };
    }
    if (url === '/api/agent_builder/conversations') {
      return { id: body.conversation_id, title: body.title };
    }
    if (init?.method === 'POST') {
      return runResponse;
    }
    return execution;
  }) as unknown as HttpHandler;

const mockLog = () => ({ info: jest.fn(), warning: jest.fn(), error: jest.fn() } as never);

const GUIDE_PAYLOAD = {
  IncidentId: '40',
  Timestamp: '2024-06-12T13:22:38.000Z',
  DetectorId: ['0', '14'],
  DetectorNames: ['SigninLogs', 'AzureActivity'],
  MitreTechniques: ['T1110', 'T1539'],
  Category: ['CredentialAccess', 'InitialAccess'],
  EvidenceRowCount: 10019,
  Devices: ['153085'],
  Accounts: ['10479'],
  ActionGrouped: ['ContainAccount'],
  ActionGranular: ['disable user'],
  SuspicionLevel: [],
  EntityTypes: ['User', 'Ip'],
  EvidenceRoles: ['Impacted'],
};

describe('deriveInvestigationId', () => {
  it('derives a UUIDv8 from the hex AD id exactly like resolve_investigation_id', () => {
    // document id slice with the version/variant nibbles forced to 8
    expect(deriveInvestigationId(AD_DOC_ID)).toBe(
      `${AD_DOC_ID.slice(0, 8)}-${AD_DOC_ID.slice(8, 12)}-8${AD_DOC_ID.slice(
        12,
        15
      )}-8${AD_DOC_ID.slice(15, 18)}-${AD_DOC_ID.slice(18, 30)}`
    );
    expect(deriveInvestigationId(AD_DOC_ID)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('returns null for non-hex ids (caller falls back to a random UUID)', () => {
    expect(deriveInvestigationId('doc-1')).toBeNull();
    expect(deriveInvestigationId('')).toBeNull();
  });
});

describe('buildAttackDiscoveryFromPayload', () => {
  it('maps corpus payload evidence onto the persisted AD document fields', () => {
    const doc = buildAttackDiscoveryFromPayload('guide-sanity-40', GUIDE_PAYLOAD);
    expect(doc.title).toContain('GUIDE 40');
    expect(doc.summaryMarkdown).toContain('10019');
    expect(doc.summaryMarkdown).toContain('CredentialAccess');
    expect(doc.detailsMarkdown).toContain('- Detector names: SigninLogs, AzureActivity');
    expect(doc.detailsMarkdown).toContain('- MITRE technique signatures: T1110, T1539');
    expect(doc.entitySummaryMarkdown).toBe(
      'Host {{ host.name 153085 }} User {{ user.name 10479 }}'
    );
    expect(doc.mitreAttackTactics).toEqual(['CredentialAccess', 'InitialAccess']);
    expect(doc.alertIds).toEqual(['case-guide-sanity-40-alert-1']);
    expect(doc.timestamp).toBe('2024-06-12T13:22:38.000Z');
  });

  it('never leaks the gold label or rationale into the seeded document', () => {
    const doc = buildAttackDiscoveryFromPayload('c1', {
      ...GUIDE_PAYLOAD,
      label: 'true_positive',
      gold_rationale: 'the answer is true positive',
    });
    const rendered = JSON.stringify(doc);
    expect(rendered).not.toContain('true_positive');
    expect(rendered).not.toContain('the answer is true positive');
  });

  it('renders empty lists as "none recorded" and omits entity summary when absent', () => {
    const doc = buildAttackDiscoveryFromPayload('c2', {});
    expect(doc.summaryMarkdown).toContain('unknown evidence rows');
    expect(doc.detailsMarkdown).toContain('none recorded');
    expect(doc.entitySummaryMarkdown).toBeUndefined();
  });

  it('dispatches chain payloads (events list) to the chain renderer', () => {
    const doc = buildAttackDiscoveryFromPayload('c3', {
      attack_chain: 'mimicrat-clickfix',
      events: [
        {
          '@timestamp': '2026-02-11T10:00:00.000Z',
          event: { sequence: 1, category: 'process', action: 'process_started' },
          host: { name: 'WS-FIN-214' },
          user: { name: 'j.meyer', domain: 'CORP' },
          process: { pid: 4812, name: 'powershell.exe', command_line: 'powershell.exe -W H' },
          message: 'clipboard-injected obfuscated PowerShell executed',
        },
      ],
    });
    expect(doc.title).toContain('mimicrat-clickfix');
    expect(doc.detailsMarkdown).toContain('powershell.exe');
    expect(doc.detailsMarkdown).not.toContain('Categories:');
    expect(doc.mitreAttackTactics).toEqual(['process']);
    expect(doc.timestamp).toBe('2026-02-11T10:00:00.000Z');
  });

  it('dispatches BOTSv3 rule-match payloads to the matched_events renderer', () => {
    const doc = buildAttackDiscoveryFromPayload('c4', {
      rule_name: 'Accepted Default Telnet Port Connection',
      rule_id: '34fde489',
      language: 'kuery',
      match_kind: 'event',
      severity: 'medium',
      matched_events: [
        { timestamp: '2018-08-20T10:43:38.000Z', host: 'FROTHLY-FW1', sourcetype: 'cisco:asa' },
      ],
    });
    expect(doc.title).toContain('Accepted Default Telnet Port Connection');
    expect(doc.detailsMarkdown).toContain('FROTHLY-FW1');
    expect(doc.timestamp).toBe('2018-08-20T10:43:38.000Z');
  });

  it('dispatches single-ECS cloud payloads to the cloud renderer', () => {
    const doc = buildAttackDiscoveryFromPayload('c5', {
      '@timestamp': '2026-09-21T02:00:00.000Z',
      event_code: 'Microsoft.Compute/snapshots/delete',
      event: { action: 'Microsoft.Compute/snapshots/delete', outcome: 'Succeeded' },
      user: { name: 'svc-backup', id: 'u-1' },
      cloud: { provider: 'azure', 'account.id': 'acc-1' },
      azure: { activitylogs: { operation_name: 'Microsoft.Compute/snapshots/delete' } },
    });
    expect(doc.title).toContain('snapshots/delete');
    expect(doc.detailsMarkdown).toContain('svc-backup');
    expect(doc.timestamp).toBe('2026-09-21T02:00:00.000Z');
  });

  it('dispatches benign-window payloads to the window renderer (no events)', () => {
    const doc = buildAttackDiscoveryFromPayload('c6', {
      window_start_utc: '2018-08-20T00:00:00Z',
      window_end_utc: '2018-08-20T00:15:00Z',
      dataset: 'botsv3',
      capture_day: '2018-08-20',
      exclusion_spec: 'botsv3/exclusion_spec.json',
    });
    expect(doc.title).toContain('Benign window');
    expect(doc.detailsMarkdown).toContain('none recorded');
    expect(doc.timestamp).toBe('2018-08-20T00:00:00Z');
  });

  it('throws a shape error for unrecognized non-empty payloads', () => {
    expect(() => buildAttackDiscoveryFromPayload('c7', { totally: 'unknown' })).toThrow(
      /matches no known corpus shape/
    );
  });
});

describe('seedAttackDiscovery', () => {
  it('POSTs the data_generator route with internal-origin headers and the mapped doc', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return { data: [{ id: AD_DOC_ID }] };
    }) as never;
    const doc = buildAttackDiscoveryFromPayload('c1', GUIDE_PAYLOAD);
    const persisted = await seedAttackDiscovery({ fetch, log: mockLog() }, doc);

    expect(persisted.id).toBe(AD_DOC_ID);
    expect(calls[0].url).toBe(
      '/internal/elastic_assistant/data_generator/attack_discoveries/_create'
    );
    expect((calls[0].init as RequestInit).method).toBe('POST');
    const headers = (calls[0].init as RequestInit).headers as Record<string, string>;
    expect(headers['x-elastic-internal-origin']).toBe('Kibana');
    expect(headers['kbn-xsrf']).toBe('true');
    const body = JSON.parse((calls[0].init as RequestInit).body as string);
    expect(body.attackDiscoveries[0].title).toBe(doc.title);
    expect(body.attackDiscoveries[0].summaryMarkdown).toBe(doc.summaryMarkdown);
    expect(body.apiConfig.connectorId).toBe('none');
  });

  it('throws (no id invented) when the route returns no persisted document', async () => {
    const fetch = (async () => ({ data: [] })) as never;
    await expect(
      seedAttackDiscovery(
        { fetch, log: mockLog() },
        buildAttackDiscoveryFromPayload('c1', GUIDE_PAYLOAD)
      )
    ).rejects.toThrow('no persisted attack discovery id');
  });
});

describe('seedInvestigation', () => {
  it('creates the conversation with the derived UUIDv8 id and the AD title', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return { id: 'x' };
    }) as never;
    const conversationId = await seedInvestigation(
      { fetch, log: mockLog() },
      AD_DOC_ID,
      'AD title'
    );

    expect(conversationId).toBe(deriveInvestigationId(AD_DOC_ID));
    expect(calls[0].url).toBe('/api/agent_builder/conversations');
    const body = JSON.parse((calls[0].init as RequestInit).body as string);
    expect(body.conversation_id).toBe(conversationId);
    expect(body.title).toBe('AD title');
    // No message field: the investigation agent must not be woken.
    expect(body.message).toBeUndefined();
    expect(body.messages).toBeUndefined();
  });

  it('falls back to a random UUID when the AD id is not hex-derivable', async () => {
    const conversationId = await seedInvestigation(
      { fetch: (async () => ({})) as never, log: mockLog() },
      'not-hex-id',
      't'
    );
    expect(conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});

describe('readAgentVerdict', () => {
  it('extracts a verdict from structured_output.verdict', () => {
    const verdict = { verdict: 'false_positive', summary_markdown: 's', confidence: 0.9 };
    const steps = [
      agentStep({ output: null }),
      agentStep({ output: { structured_output: { verdict } } }),
    ];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });

  it('falls back to structured_output.verdicts[0]', () => {
    const verdict = { verdict: 'true_positive' };
    const steps = [agentStep({ output: { structured_output: { verdicts: [verdict] } } })];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });

  it('returns undefined when no agent step produced output', () => {
    expect(readAgentVerdict([agentStep({ output: null })])).toBeUndefined();
  });

  it('matches agent steps by stepId fallback when stepType is omitted', () => {
    const verdict = { verdict: 'inconclusive' };
    const steps = [agentStep({ stepType: undefined, output: { structured_output: { verdict } } })];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });
});

describe('readWorkflowOutput + normalizeVerdictLabel', () => {
  it('prefers the workflow output verdict, falling back to the agent structured output', () => {
    const execution = {
      output: {
        verdict: 'true_positive',
        summary_markdown: 's',
        analysis_execution_id: 'child-1',
      },
      stepExecutions: [
        agentStep({ output: { structured_output: { verdict: { verdict: 'false_positive' } } } }),
      ],
    } as never;

    const workflowOutput = readWorkflowOutput(execution as never);
    expect(workflowOutput?.verdict).toBe('true_positive');
    expect(normalizeVerdictLabel({ workflowOutput })).toBe('true_positive');
    expect(normalizeVerdictLabel({ verdict: { verdict: 'false_positive' } })).toBe(
      'false_positive'
    );
  });

  it('normalizes agent-level verdict/label/classification aliases', () => {
    expect(normalizeVerdictLabel({ verdict: { verdict: 'inconclusive' } })).toBe('inconclusive');
    expect(normalizeVerdictLabel({ verdict: { label: 'inconclusive' } })).toBe('inconclusive');
    expect(normalizeVerdictLabel({ verdict: { classification: 'true_positive' } })).toBe(
      'true_positive'
    );
    expect(normalizeVerdictLabel({})).toBeUndefined();
  });
});

describe('runAttackDiscoveryWorkflow (corpus → ids bridge)', () => {
  const completedExecution = {
    status: 'completed',
    traceId: 'trace-1',
    output: {
      verdict: 'false_positive',
      summary_markdown: 'not a real attack',
      analysis_execution_id: 'child-9',
    },
    stepExecutions: [
      agentStep({
        output: {
          structured_output: {
            verdict: {
              verdict: 'false_positive',
              summary_markdown: 'not a real attack',
              confidence: 0.8,
            },
          },
        },
      }),
    ],
  };

  it('seeds AD + investigation, then posts ONLY the two ids to the workflow', async () => {
    const calls: { url: string; method?: string; body: Record<string, unknown> }[] = [];
    const fetch = bridgeFetch({ calls, execution: completedExecution });
    const result = await runAttackDiscoveryWorkflow({
      fetch,
      log: mockLog(),
      payload: GUIDE_PAYLOAD,
      caseId: 'guide-sanity-40',
    });

    // Order of bridge calls: seed AD doc → open investigation → run workflow.
    expect(calls[0].url).toBe(
      '/internal/elastic_assistant/data_generator/attack_discoveries/_create'
    );
    expect(calls[1].url).toBe('/api/agent_builder/conversations');
    expect(calls[2].url).toBe(
      '/api/workflows/workflow/system-security-attack-discovery-fp-tp-analysis/run'
    );
    expect(calls[3].url).toBe('/api/workflows/executions/exec-1');

    // THE ID WIRING: the workflow inputs carry exactly the derived ids.
    expect(calls[2].body).toEqual({
      inputs: {
        attack_discovery_id: AD_DOC_ID,
        investigation_id: deriveInvestigationId(AD_DOC_ID),
      },
    });

    expect(result.workflowOutput?.verdict).toBe('false_positive');
    expect(result.workflowOutput?.analysis_execution_id).toBe('child-9');
    expect(result.verdict?.confidence).toBe(0.8);
    expect(result.executionId).toBe('exec-1');
    expect(result.executionStatus).toBe('completed');
    expect(result.seedingError).toBeUndefined();
  });

  it('wires the investigation id to the ACTUAL persisted id from the route response', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const otherId = 'f'.repeat(32);
    const fetch = bridgeFetch({
      calls,
      adDoc: { id: otherId, title: 'other' },
      execution: completedExecution,
    });
    await runAttackDiscoveryWorkflow({
      fetch,
      log: mockLog(),
      payload: GUIDE_PAYLOAD,
      caseId: 'c1',
    });

    // conversation_id of the seeded investigation derives from the persisted id…
    const convBody = calls[1].body;
    expect(convBody.conversation_id).toBe(deriveInvestigationId(otherId));
    // …and the workflow inputs re-use exactly that id.
    expect(calls[2].body.inputs).toEqual({
      attack_discovery_id: otherId,
      investigation_id: deriveInvestigationId(otherId),
    });
  });

  it('degrades honestly to a failed, no-verdict output (never skips) when seeding fails', async () => {
    const fetch = (async (url: string) => {
      if (url === '/internal/elastic_assistant/data_generator/attack_discoveries/_create') {
        throw new Error('403 forbidden: privileged user required');
      }
      throw new Error(`unexpected call to ${url}`);
    }) as never;
    const log = mockLog() as unknown as { error: jest.Mock };

    const result = await runAttackDiscoveryWorkflow({
      fetch,
      log: log as never,
      payload: GUIDE_PAYLOAD,
      caseId: 'c1',
    });

    expect(result.executionStatus).toBe('failed');
    expect(result.seedingError).toContain('403 forbidden');
    expect(result.verdict).toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });

  it('returns an undefined verdict (no throw) when the workflow failed', async () => {
    const fetch = bridgeFetch({
      execution: { status: 'failed', stepExecutions: [] },
      runResponse: { workflowExecutionId: 'exec-2' },
    });
    const result = await runAttackDiscoveryWorkflow({
      fetch,
      log: mockLog(),
      payload: {},
      caseId: 'c1',
    });
    expect(result.verdict).toBeUndefined();
    expect(result.workflowOutput).toBeUndefined();
    expect(result.executionStatus).toBe('failed');
  });

  it('warns (no throw) when polling exceeds the deadline', async () => {
    const log: { info: jest.Mock; warning: jest.Mock; error: jest.Mock } = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    };
    const fetch = bridgeFetch({
      runResponse: { workflowExecutionId: 'exec-3' },
      execution: { status: 'running', stepExecutions: [] },
    });

    const result = await runAttackDiscoveryWorkflow({
      fetch,
      log: log as never,
      payload: {},
      caseId: 'c1',
      maxWaitMs: 10,
      pollIntervalMs: 1,
    });
    expect(TerminalExecutionStatuses.includes(result.executionStatus)).toBe(false);
    expect(log.warning).toHaveBeenCalled();
  });
});
