/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildProposalSubjectKey,
  buildProposalSubjectKeyFromActionInput,
} from './proposal_subject_key';

describe('buildProposalSubjectKey', () => {
  it('builds stable subject keys for the same host × action × process', () => {
    const key = {
      subjectId: 'e',
      actionWorkflowId: 'a',
      processKey: 'p',
    };

    expect(buildProposalSubjectKey(key)).toBe(buildProposalSubjectKey({ ...key }));
  });

  it('builds different subject keys for a different host, action or process', () => {
    const key = { subjectId: 'e', actionWorkflowId: 'a', processKey: 'p' };
    const keys = [
      buildProposalSubjectKey(key),
      buildProposalSubjectKey({ ...key, subjectId: 'e2' }),
      buildProposalSubjectKey({ ...key, actionWorkflowId: 'a2' }),
      buildProposalSubjectKey({ ...key, processKey: 'p2' }),
      buildProposalSubjectKey({ subjectId: 'e', actionWorkflowId: 'a' }),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });

  // Hunt Proposals already live under these keys. A different worker proposing the same
  // action on the same agent has to land on the same key, or it raises a duplicate.
  it('is pinned, because changing the namespace or the material strands every live proposal', () => {
    expect(
      buildProposalSubjectKey({
        subjectId: 'agent-a',
        actionWorkflowId: 'system-security-action-isolate-host',
      })
    ).toBe('6f30494e-d19c-51d9-94b3-da6a6e4a17fd');
    expect(
      buildProposalSubjectKey({
        subjectId: 'agent-a',
        actionWorkflowId: 'system-security-action-kill-process',
        processKey: 'entity_id:ent-4242',
      })
    ).toBe('d9e71ca7-10a9-5cd4-b5c2-3bfe4fe7ab1b');
  });
});

// Hunt builds its keys from run state (agent id, process selector, identity). A worker that only
// has the action input has to land on the same key, or the two never converge.
describe('buildProposalSubjectKeyFromActionInput', () => {
  const ISOLATE = 'system-security-action-isolate-host';
  const KILL = 'system-security-action-kill-process';
  const CRITICALITY = 'system-security-action-set-asset-criticality';

  it('keys a host action by the agent, as Hunt does', () => {
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: ISOLATE,
        actionInput: { endpoint_ids: ['agent-a'] },
      })
    ).toBe(buildProposalSubjectKey({ subjectId: 'agent-a', actionWorkflowId: ISOLATE }));
  });

  it('keys a process action by the agent and entity id, spelled as a Hunt process selector', () => {
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: KILL,
        actionInput: { endpoint_ids: ['agent-a'], parameters: { entity_id: 'ent-1' } },
      })
    ).toBe(
      buildProposalSubjectKey({
        subjectId: 'agent-a',
        actionWorkflowId: KILL,
        processKey: 'entity_id:ent-1',
      })
    );
  });

  it('falls back to the pid, and does not confuse it with an entity id', () => {
    const byPid = buildProposalSubjectKeyFromActionInput({
      actionWorkflowId: KILL,
      actionInput: { endpoint_ids: ['agent-a'], parameters: { pid: 4242 } },
    });
    expect(byPid).toBe(
      buildProposalSubjectKey({
        subjectId: 'agent-a',
        actionWorkflowId: KILL,
        processKey: 'pid:4242',
      })
    );
    expect(byPid).not.toBe(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: KILL,
        actionInput: { endpoint_ids: ['agent-a'], parameters: { entity_id: '4242' } },
      })
    );
  });

  it('reads an integer-string pid as the same pid, and ignores a non-integer string', () => {
    const byNumber = buildProposalSubjectKeyFromActionInput({
      actionWorkflowId: KILL,
      actionInput: { endpoint_ids: ['agent-a'], parameters: { pid: 4242 } },
    });
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: KILL,
        actionInput: { endpoint_ids: ['agent-a'], parameters: { pid: '4242' } },
      })
    ).toBe(byNumber);
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: KILL,
        actionInput: { endpoint_ids: ['agent-a'], parameters: { pid: '04242' } },
      })
    ).toBe(byNumber);
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: KILL,
        actionInput: { endpoint_ids: ['agent-a'], parameters: { pid: 'abc' } },
      })
    ).toBe(buildProposalSubjectKey({ subjectId: 'agent-a', actionWorkflowId: KILL }));
  });

  it('prefers the entity id when both are present', () => {
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: KILL,
        actionInput: { endpoint_ids: ['agent-a'], parameters: { entity_id: 'ent-1', pid: 4242 } },
      })
    ).toBe(
      buildProposalSubjectKey({
        subjectId: 'agent-a',
        actionWorkflowId: KILL,
        processKey: 'entity_id:ent-1',
      })
    );
  });

  it('keys an identity action as <kind>:<value>, as Hunt does', () => {
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: CRITICALITY,
        actionInput: { id_field: 'user.name', id_value: 'alice', criticality_level: 'high_impact' },
      })
    ).toBe(buildProposalSubjectKey({ subjectId: 'user:alice', actionWorkflowId: CRITICALITY }));
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: CRITICALITY,
        actionInput: { id_field: 'service.name', id_value: 'svc' },
      })
    ).toBe(buildProposalSubjectKey({ subjectId: 'service:svc', actionWorkflowId: CRITICALITY }));
  });

  it('returns nothing when the input names no target', () => {
    expect(buildProposalSubjectKeyFromActionInput({ actionWorkflowId: ISOLATE })).toBeUndefined();
    expect(
      buildProposalSubjectKeyFromActionInput({ actionWorkflowId: ISOLATE, actionInput: {} })
    ).toBeUndefined();
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: ISOLATE,
        actionInput: { endpoint_ids: [] },
      })
    ).toBeUndefined();
    expect(
      buildProposalSubjectKeyFromActionInput({
        actionWorkflowId: CRITICALITY,
        actionInput: { id_field: 'user.name' },
      })
    ).toBeUndefined();
  });
});
