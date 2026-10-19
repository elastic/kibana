/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreMapping, addMitreMappingsNode } from './add_mitre_mappings';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import {
  buildMockMitreTacticSummary,
  buildMockMitreTechniqueSummary,
  buildMockMitreSubtechniqueSummary,
  buildMockMitreEntitySummaryBuckets,
} from '../../../../../../common/detection_engine/mitre/mitre_entity_builders.mock';
import { resetResolveMitreBucketsCache } from '../../../mitre/resolve_mitre_buckets';

// Mock the prompt so the LangChain chain doesn't need real models or prompt templates.
jest.mock('./prompts', () => ({
  MITRE_MAPPING_SELECTION_PROMPT: {
    pipe: jest.fn(),
  },
}));

// 3-entity fixture for the legacy blob path. Uses the legacy MitreTactic/MitreTechnique/MitreSubTechnique
// shape so the real transformLegacyMitreData adapter can be exercised without loading the 8.4k-line blob.
jest.mock('../../../../../../common/detection_engine/mitre/mitre_tactics_techniques', () => ({
  tactics: [
    {
      id: 'TA0001',
      name: 'Initial Access',
      reference: 'https://attack.mitre.org/tactics/TA0001/',
      value: 'initialAccess',
      label: 'Initial Access (TA0001)',
    },
  ],
  techniques: [
    {
      id: 'T1078',
      name: 'Valid Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/',
      value: 'validAccounts',
      label: 'Valid Accounts (T1078)',
      tactics: ['initial-access'],
    },
  ],
  subtechniques: [
    {
      id: 'T1078.001',
      name: 'Default Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/001/',
      value: 'defaultAccounts',
      label: 'Default Accounts (T1078.001)',
      tactics: ['initial-access'],
      techniqueId: 'T1078',
    },
  ],
}));

import { MITRE_MAPPING_SELECTION_PROMPT } from './prompts';

// Fixture IDs come from the real MITRE dictionary the node validates against:
// TA0001 Initial Access, TA0002 Execution, T1078 Valid Accounts (belongs to
// initial-access but NOT execution), T1078.001 Default Accounts (sub of T1078).
const testBuckets = buildMockMitreEntitySummaryBuckets({
  tactics: [
    buildMockMitreTacticSummary({
      id: 'TA0001',
      name: 'Initial Access',
      reference: 'https://attack.mitre.org/tactics/TA0001/',
      position: 0,
    }),
    buildMockMitreTacticSummary({
      id: 'TA0002',
      name: 'Execution',
      reference: 'https://attack.mitre.org/tactics/TA0002/',
      position: 1,
    }),
  ],
  techniques: [
    // T1078 belongs to Initial Access (TA0001) but not Execution (TA0002)
    buildMockMitreTechniqueSummary({
      id: 'T1078',
      name: 'Valid Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/',
      tactic_ids: ['TA0001'],
    }),
  ],
  subtechniques: [
    buildMockMitreSubtechniqueSummary({
      id: 'T1078.001',
      name: 'Default Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/001/',
      technique_id: 'T1078',
    }),
  ],
});

describe('formatMitreMapping', () => {
  it('formats a tactic with a matching technique and subtechnique', () => {
    const result = formatMitreMapping(
      { tactics: ['TA0001'], techniques: [{ id: 'T1078', subtechnique: ['T1078.001'] }] },
      testBuckets
    );

    expect(result).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0001',
          name: 'Initial Access',
          reference: 'https://attack.mitre.org/tactics/TA0001/',
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

  it('outputs an empty technique array when no selected technique belongs to the tactic', () => {
    // T1078 is not an Execution technique, so the TA0002 mapping keeps the
    // tactic but drops the technique — `technique: []` must still be valid output.
    const result = formatMitreMapping(
      { tactics: ['TA0002'], techniques: [{ id: 'T1078' }] },
      testBuckets
    );

    expect(result).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [],
      },
    ]);
  });

  it('tolerates missing arrays in a malformed model response', () => {
    expect(formatMitreMapping({} as Parameters<typeof formatMitreMapping>[0], testBuckets)).toEqual(
      []
    );
  });
});

describe('addMitreMappingsNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetResolveMitreBucketsCache();
  });

  it('sources MITRE data from the managed client when mitreDataClient is provided', async () => {
    const invoke = jest.fn().mockResolvedValue({
      tactics: ['TA0001'],
      techniques: [{ id: 'T1078', subtechnique: ['T1078.001'] }],
    });
    (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
      pipe: jest.fn().mockReturnValue({ invoke }),
    });

    const mockList = jest.fn().mockResolvedValue({ framework: 'enterprise', ...testBuckets });
    const mitreDataClient: MitreAttackDataClient = { list: mockList, getById: jest.fn() };

    const node = addMitreMappingsNode({
      model: {} as Parameters<typeof addMitreMappingsNode>[0]['model'],
      mitreDataClient,
    });

    const state = {
      userQuery: 'detect failed logins',
      rule: { query: 'from logs-* | where event.action == "login_failure"' },
      errors: [],
    } as unknown as Parameters<typeof node>[0];

    const result = await node(state);

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(result.rule?.threat).toEqual([
      expect.objectContaining({
        framework: 'MITRE ATT&CK',
        tactic: expect.objectContaining({ id: 'TA0001', name: 'Initial Access' }),
        technique: expect.arrayContaining([
          expect.objectContaining({ id: 'T1078', name: 'Valid Accounts' }),
        ]),
      }),
    ]);
  });

  it('returns a rule without threat mappings (and a warning) when managed buckets are empty (population not yet complete)', async () => {
    const invoke = jest.fn().mockResolvedValue({
      tactics: ['TA0001'],
      techniques: [{ id: 'T1078' }],
    });
    (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
      pipe: jest.fn().mockReturnValue({ invoke }),
    });

    // Simulates the state where the managed SO has not yet been populated.
    const emptyList = jest.fn().mockResolvedValue({
      framework: 'enterprise',
      tactics: [],
      techniques: [],
      subtechniques: [],
    });
    const mitreDataClient: MitreAttackDataClient = { list: emptyList, getById: jest.fn() };

    const node = addMitreMappingsNode({
      model: {} as Parameters<typeof addMitreMappingsNode>[0]['model'],
      mitreDataClient,
    });

    const state = {
      userQuery: 'detect failed logins',
      rule: { query: 'from logs-*' },
      errors: [],
    } as unknown as Parameters<typeof node>[0];

    const result = await node(state);

    // The node must not throw — a rule without threat mappings is recoverable;
    // a failed rule creation is not.
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Managed MITRE data is not initialized')])
    );
    expect(result.rule?.threat).toBeUndefined();
  });

  it('falls back to the adapted legacy blob when mitreDataClient is absent', async () => {
    // Model selects the fixture tactic/technique defined in the mock blob below.
    const invoke = jest.fn().mockResolvedValue({
      tactics: ['TA0001'],
      techniques: [{ id: 'T1078', subtechnique: ['T1078.001'] }],
    });
    (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
      pipe: jest.fn().mockReturnValue({ invoke }),
    });

    const node = addMitreMappingsNode({
      model: {} as Parameters<typeof addMitreMappingsNode>[0]['model'],
      // No mitreDataClient — flag is off; adapter integration is under test.
    });

    const state = {
      userQuery: 'detect failed logins',
      rule: { query: 'from logs-*' },
      errors: [],
    } as unknown as Parameters<typeof node>[0];

    const result = await node(state);
    expect(result.warnings).toBeUndefined();
    expect(result.rule?.threat).toEqual([
      expect.objectContaining({
        framework: 'MITRE ATT&CK',
        tactic: expect.objectContaining({ id: 'TA0001', name: 'Initial Access' }),
        technique: expect.arrayContaining([
          expect.objectContaining({
            id: 'T1078',
            name: 'Valid Accounts',
            subtechnique: expect.arrayContaining([
              expect.objectContaining({ id: 'T1078.001', name: 'Default Accounts' }),
            ]),
          }),
        ]),
      }),
    ]);
  });
});
