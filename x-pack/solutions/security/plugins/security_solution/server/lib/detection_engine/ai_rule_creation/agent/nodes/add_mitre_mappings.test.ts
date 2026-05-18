/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import type { MitreAttackDataClient } from '../../../../mitre_attack';
import { addMitreMappingsNode } from './add_mitre_mappings';
import { MITRE_MAPPING_SELECTION_PROMPT } from './prompts';

jest.mock('./prompts', () => ({
  MITRE_MAPPING_SELECTION_PROMPT: { pipe: jest.fn() },
}));

const tactic: MitreEntity = {
  type: 'tactic',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'TA0006',
  name: 'Credential Access',
  reference: 'https://attack.mitre.org/tactics/TA0006/',
  description: 'desc',
};

const technique: MitreEntity = {
  type: 'technique',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'T1078',
  name: 'Valid Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/',
  description: 'desc',
  tactics: ['credential-access'],
};

const subtechnique: MitreEntity = {
  type: 'subtechnique',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'T1078.001',
  name: 'Default Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/001/',
  description: 'desc',
  tactics: ['credential-access'],
  techniqueId: 'T1078',
};

const persistenceTactic: MitreEntity = {
  type: 'tactic',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'TA0003',
  name: 'Persistence',
  reference: 'https://attack.mitre.org/tactics/TA0003/',
  description: 'persistence desc',
};

// A v18 technique unknown to legacy data — used to validate that retrieve-then-
// choose can surface and select techniques the LLM has no prior knowledge of.
const cloudAppIntegrationTechnique: MitreEntity = {
  type: 'technique',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'T1671',
  name: 'Cloud Application Integration',
  reference: 'https://attack.mitre.org/techniques/T1671/',
  description: 'Adversaries may abuse cloud application integration to maintain access.',
  tactics: ['persistence'],
};

interface InvokePayload {
  user_request: string;
  esql_query: string;
  rule_tags: string;
  candidate_mitre: string;
}

const setupChainMock = (
  llmResponse: { tactics: string[]; techniques: Array<{ id: string; subtechnique?: string[] }> }
) => {
  const llmInvoke = jest.fn().mockResolvedValue(llmResponse);
  const capturedInvokes: InvokePayload[] = [];
  const wrappedInvoke = jest.fn(async (payload: InvokePayload) => {
    capturedInvokes.push(payload);
    return llmInvoke(payload);
  });
  (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
    pipe: () => ({ invoke: wrappedInvoke }),
  });
  return { llmInvoke, capturedInvokes };
};

describe('addMitreMappingsNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses MitreAttackDataClient when provided to validate IDs', async () => {
    const { capturedInvokes } = setupChainMock({
      tactics: ['TA0006'],
      techniques: [{ id: 'T1078', subtechnique: ['T1078.001'] }],
    });

    const getById = jest.fn(async (_framework: string, id: string) => {
      if (id === 'TA0006') return tactic;
      if (id === 'T1078') return technique;
      if (id === 'T1078.001') return subtechnique;
      return undefined;
    });
    const list = jest.fn().mockResolvedValue([tactic]);
    const search = jest.fn().mockResolvedValue([technique, subtechnique]);
    const mitreAttackDataClient = {
      getById,
      list,
      search,
    } as unknown as MitreAttackDataClient;

    const node = addMitreMappingsNode({
      model: {} as never,
      mitreAttackDataClient,
    });

    const result = await node({
      userQuery: 'detect credential access',
      rule: { query: 'FROM logs', tags: [] },
      errors: [],
      warnings: [],
    } as never);

    expect(getById).toHaveBeenCalledWith('enterprise', 'TA0006');
    expect(getById).toHaveBeenCalledWith('enterprise', 'T1078');
    expect(getById).toHaveBeenCalledWith('enterprise', 'T1078.001');

    expect(result.rule?.threat).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0006',
          name: 'Credential Access',
          reference: 'https://attack.mitre.org/tactics/TA0006/',
        },
        technique: [
          {
            id: 'T1078',
            name: 'Valid Accounts',
            reference: 'https://attack.mitre.org/techniques/T1078/',
            subtechnique: [
              {
                id: 'T1078.001',
                name: 'Default Accounts',
                reference: 'https://attack.mitre.org/techniques/T1078/001/',
              },
            ],
          },
        ],
      },
    ]);

    expect(capturedInvokes).toHaveLength(1);
    expect(capturedInvokes[0]?.candidate_mitre).toContain('T1078 Valid Accounts');
  });

  it('retrieves candidates from the managed index and lets the LLM pick a v18 technique unknown to legacy data', async () => {
    const { capturedInvokes } = setupChainMock({
      tactics: ['TA0003'],
      techniques: [{ id: 'T1671' }],
    });

    const getById = jest.fn(async (_framework: string, id: string) => {
      if (id === 'TA0003') return persistenceTactic;
      if (id === 'T1671') return cloudAppIntegrationTechnique;
      return undefined;
    });
    const list = jest.fn().mockResolvedValue([persistenceTactic]);
    const search = jest.fn().mockResolvedValue([cloudAppIntegrationTechnique]);
    const mitreAttackDataClient = {
      getById,
      list,
      search,
    } as unknown as MitreAttackDataClient;

    const node = addMitreMappingsNode({
      model: {} as never,
      mitreAttackDataClient,
    });

    const result = await node({
      userQuery: 'rule that covers Cloud Application Integration threats',
      rule: { query: 'FROM logs-cloud.*', tags: ['cloud'] },
      errors: [],
      warnings: [],
    } as never);

    expect(list).toHaveBeenCalledWith({ framework: 'enterprise', types: ['tactic'] });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        framework: 'enterprise',
        types: ['technique', 'subtechnique'],
      })
    );

    const candidateBlock = capturedInvokes[0]?.candidate_mitre ?? '';
    expect(candidateBlock).toContain('TA0003 Persistence');
    expect(candidateBlock).toContain('T1671 Cloud Application Integration');
    expect(candidateBlock).toContain('tactics: persistence');

    expect(result.rule?.threat?.[0]?.tactic.id).toBe('TA0003');
    expect(result.rule?.threat?.[0]?.technique?.[0]?.id).toBe('T1671');
  });

  it('falls back to legacy lookups and supplies an empty candidate block when no client is provided', async () => {
    const { capturedInvokes } = setupChainMock({
      tactics: ['TA0006'],
      techniques: [{ id: 'T1078' }],
    });

    const node = addMitreMappingsNode({ model: {} as never });

    const result = await node({
      userQuery: 'q',
      rule: { query: '', tags: [] },
      errors: [],
      warnings: [],
    } as never);

    const threat = result.rule?.threat ?? [];
    expect(threat.length).toBeGreaterThan(0);
    expect(threat[0]?.tactic.id).toBe('TA0006');

    expect(capturedInvokes[0]?.candidate_mitre).toBe('');
  });

  it('drops techniques whose tactics do not match the requested tactic', async () => {
    setupChainMock({
      tactics: ['TA0006'],
      techniques: [{ id: 'T9999' }],
    });

    const otherTechnique: MitreEntity = {
      ...technique,
      id: 'T9999',
      tactics: ['discovery'],
    };

    const getById = jest.fn(async (_framework: string, id: string) => {
      if (id === 'TA0006') return tactic;
      if (id === 'T9999') return otherTechnique;
      return undefined;
    });
    const list = jest.fn().mockResolvedValue([tactic]);
    const search = jest.fn().mockResolvedValue([otherTechnique]);
    const mitreAttackDataClient = {
      getById,
      list,
      search,
    } as unknown as MitreAttackDataClient;

    const node = addMitreMappingsNode({ model: {} as never, mitreAttackDataClient });

    const result = await node({
      userQuery: 'q',
      rule: { query: '', tags: [] },
      errors: [],
      warnings: [],
    } as never);

    expect(result.rule?.threat?.[0]?.technique).toBeUndefined();
  });
});
