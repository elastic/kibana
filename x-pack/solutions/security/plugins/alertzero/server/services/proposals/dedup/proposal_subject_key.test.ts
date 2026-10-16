/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildProposalSubjectKey } from './proposal_subject_key';

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
        processKey: 'entity:ent-4242',
      })
    ).toBe('e7f4d23d-c0a4-57a8-804e-a1cbca13bc1c');
  });
});
