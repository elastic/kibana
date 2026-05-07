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

describe('addMitreMappingsNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses MitreAttackDataClient when provided to validate IDs', async () => {
    const llmInvoke = jest.fn().mockResolvedValue({
      tactics: ['TA0006'],
      techniques: [{ id: 'T1078', subtechnique: ['T1078.001'] }],
    });
    (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
      pipe: () => ({ invoke: llmInvoke }),
    });

    const getById = jest.fn(async (_framework: string, id: string) => {
      if (id === 'TA0006') return tactic;
      if (id === 'T1078') return technique;
      if (id === 'T1078.001') return subtechnique;
      return undefined;
    });
    const mitreAttackDataClient = {
      getById,
      list: jest.fn(),
      search: jest.fn(),
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
  });

  it('falls back to legacy lookups when no client is provided', async () => {
    const llmInvoke = jest.fn().mockResolvedValue({
      tactics: ['TA0006'],
      techniques: [{ id: 'T1078' }],
    });
    (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
      pipe: () => ({ invoke: llmInvoke }),
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
  });

  it('drops techniques whose tactics do not match the requested tactic', async () => {
    const llmInvoke = jest.fn().mockResolvedValue({
      tactics: ['TA0006'],
      techniques: [{ id: 'T9999' }],
    });
    (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
      pipe: () => ({ invoke: llmInvoke }),
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
    const mitreAttackDataClient = {
      getById,
      list: jest.fn(),
      search: jest.fn(),
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
