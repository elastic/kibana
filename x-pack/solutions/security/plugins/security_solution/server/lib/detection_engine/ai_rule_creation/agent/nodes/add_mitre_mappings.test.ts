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

const atlasBuckets = buildMockMitreEntitySummaryBuckets({
  tactics: [
    buildMockMitreTacticSummary({
      id: 'AML.TA0000',
      name: 'AI Model Access',
      reference: 'https://atlas.mitre.org/tactics/AML.TA0000',
      position: 0,
    }),
  ],
  techniques: [
    buildMockMitreTechniqueSummary({
      id: 'AML.T0044',
      name: 'Full AI Model Access',
      reference: 'https://atlas.mitre.org/techniques/AML.T0044',
      tactic_ids: ['AML.TA0000'],
    }),
    buildMockMitreTechniqueSummary({
      id: 'AML.T0024',
      name: 'Exfiltration via AI Inference API',
      reference: 'https://atlas.mitre.org/techniques/AML.T0024',
      tactic_ids: ['AML.TA0000'],
    }),
  ],
  subtechniques: [
    buildMockMitreSubtechniqueSummary({
      id: 'AML.T0024.002',
      name: 'Extract AI Model',
      reference: 'https://atlas.mitre.org/techniques/AML.T0024.002',
      technique_id: 'AML.T0024',
    }),
  ],
});

const buildNode = (list: jest.Mock) =>
  addMitreMappingsNode({
    model: {} as Parameters<typeof addMitreMappingsNode>[0]['model'],
    mitreDataClient: { list, getById: jest.fn() } as MitreAttackDataClient,
  });

const buildState = () =>
  ({
    userQuery: 'detect model theft',
    rule: { query: 'from logs-*' },
    errors: [],
  } as unknown as Parameters<ReturnType<typeof addMitreMappingsNode>>[0]);

const mockModelResponse = (response: unknown): void => {
  (MITRE_MAPPING_SELECTION_PROMPT.pipe as jest.Mock).mockReturnValue({
    pipe: jest.fn().mockReturnValue({ invoke: jest.fn().mockResolvedValue(response) }),
  });
};

const listByFramework = (atlas: () => Promise<unknown>) =>
  jest
    .fn()
    .mockImplementation((params: { framework: string }) =>
      params.framework === 'atlas'
        ? atlas()
        : Promise.resolve({ framework: 'enterprise', ...testBuckets })
    );

describe('formatMitreMapping', () => {
  it('formats a tactic with a matching technique and subtechnique', () => {
    const result = formatMitreMapping(
      { tactics: ['TA0001'], techniques: [{ id: 'T1078', subtechnique: ['T1078.001'] }] },
      { enterprise: testBuckets }
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

  it('re-homes a technique under its own tactic when it does not belong to the selected tactic', () => {
    // T1078 belongs only to TA0001 (not Execution), so TA0002 keeps `technique: []` and the
    // technique is re-homed under its single tactic (TA0001).
    const result = formatMitreMapping(
      { tactics: ['TA0002'], techniques: [{ id: 'T1078' }] },
      { enterprise: testBuckets }
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
          },
        ],
      },
    ]);
  });

  it('adds no extra tactic entry for a technique already under a selected tactic', () => {
    const result = formatMitreMapping(
      { tactics: ['TA0001', 'TA0002'], techniques: [{ id: 'T1078' }] },
      { enterprise: testBuckets }
    );

    expect(result.map(({ tactic }) => tactic.id)).toEqual(['TA0001', 'TA0002']);
    expect(result[0].technique).toEqual([expect.objectContaining({ id: 'T1078' })]);
    expect(result[1].technique).toEqual([]);
  });

  it('drops a technique with an unknown id without adding a tactic entry', () => {
    const result = formatMitreMapping(
      { tactics: ['TA0002'], techniques: [{ id: 'T9999' }] },
      { enterprise: testBuckets }
    );

    expect(result).toEqual([
      expect.objectContaining({ tactic: expect.objectContaining({ id: 'TA0002' }), technique: [] }),
    ]);
  });

  it('drops a multi-tactic technique when none of its tactics is selected', () => {
    const bucketsWithMulti = buildMockMitreEntitySummaryBuckets({
      ...testBuckets,
      techniques: [
        ...testBuckets.techniques,
        buildMockMitreTechniqueSummary({
          id: 'T9001',
          name: 'Multi Tactic Technique',
          reference: 'https://attack.mitre.org/techniques/T9001/',
          tactic_ids: ['TA0001', 'TA0003'],
        }),
      ],
    });

    const result = formatMitreMapping(
      { tactics: ['TA0002'], techniques: [{ id: 'T9001' }] },
      { enterprise: bucketsWithMulti }
    );

    expect(result).toEqual([
      expect.objectContaining({ tactic: expect.objectContaining({ id: 'TA0002' }), technique: [] }),
    ]);
  });

  it('drops a technique with empty tactic_ids without throwing', () => {
    const bucketsWithOrphan = buildMockMitreEntitySummaryBuckets({
      ...testBuckets,
      techniques: [
        ...testBuckets.techniques,
        buildMockMitreTechniqueSummary({
          id: 'T9000',
          name: 'Orphan Technique',
          reference: 'https://attack.mitre.org/techniques/T9000/',
          tactic_ids: [],
        }),
      ],
    });

    const result = formatMitreMapping(
      { tactics: ['TA0002'], techniques: [{ id: 'T9000' }] },
      { enterprise: bucketsWithOrphan }
    );

    expect(result).toEqual([
      expect.objectContaining({ tactic: expect.objectContaining({ id: 'TA0002' }), technique: [] }),
    ]);
  });

  it('maps ATT&CK and ATLAS tactics to their own frameworks', () => {
    const result = formatMitreMapping(
      {
        tactics: ['TA0001', 'AML.TA0000'],
        techniques: [{ id: 'T1078' }, { id: 'AML.T0024', subtechnique: ['AML.T0024.002'] }],
      },
      { enterprise: testBuckets, atlas: atlasBuckets }
    );

    expect(result).toEqual([
      expect.objectContaining({
        framework: 'MITRE ATT&CK',
        tactic: expect.objectContaining({ id: 'TA0001' }),
        technique: [expect.objectContaining({ id: 'T1078' })],
      }),
      expect.objectContaining({
        framework: 'MITRE ATLAS',
        tactic: expect.objectContaining({ id: 'AML.TA0000' }),
        technique: [
          expect.objectContaining({
            id: 'AML.T0024',
            subtechnique: [expect.objectContaining({ id: 'AML.T0024.002' })],
          }),
        ],
      }),
    ]);
  });

  it('re-homes an ATLAS technique selected under an ATT&CK tactic to its ATLAS tactic', () => {
    const result = formatMitreMapping(
      { tactics: ['TA0001'], techniques: [{ id: 'AML.T0044' }] },
      { enterprise: testBuckets, atlas: atlasBuckets }
    );

    expect(result).toEqual([
      expect.objectContaining({
        framework: 'MITRE ATT&CK',
        tactic: expect.objectContaining({ id: 'TA0001' }),
        technique: [],
      }),
      expect.objectContaining({
        framework: 'MITRE ATLAS',
        tactic: expect.objectContaining({ id: 'AML.TA0000' }),
        technique: [expect.objectContaining({ id: 'AML.T0044' })],
      }),
    ]);
  });

  it('tolerates missing arrays in a malformed model response', () => {
    expect(
      formatMitreMapping({} as Parameters<typeof formatMitreMapping>[0], {
        enterprise: testBuckets,
      })
    ).toEqual([]);
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

    const mockList = listByFramework(() =>
      Promise.resolve({ framework: 'atlas', ...atlasBuckets })
    );
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

    expect(mockList).toHaveBeenCalledTimes(2);
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
      expect.arrayContaining([expect.stringContaining('MITRE data is unavailable')])
    );
    expect(result.rule?.threat).toBeUndefined();
  });

  it('returns ATT&CK and ATLAS mappings together', async () => {
    mockModelResponse({
      tactics: ['TA0001', 'AML.TA0000'],
      techniques: [{ id: 'T1078' }, { id: 'AML.T0024', subtechnique: ['AML.T0024.002'] }],
    });
    const node = buildNode(
      listByFramework(() => Promise.resolve({ framework: 'atlas', ...atlasBuckets }))
    );

    const result = await node(buildState());

    expect(result.warnings).toBeUndefined();
    expect(result.rule?.threat?.map(({ framework }) => framework)).toEqual([
      'MITRE ATT&CK',
      'MITRE ATLAS',
    ]);
  });

  it('keeps the ATT&CK mapping without a warning when ATLAS fails to resolve', async () => {
    mockModelResponse({ tactics: ['TA0001'], techniques: [{ id: 'T1078' }] });
    const node = buildNode(listByFramework(() => Promise.reject(new Error('atlas down'))));

    const result = await node(buildState());

    expect(result.warnings).toBeUndefined();
    expect(result.rule?.threat).toEqual([expect.objectContaining({ framework: 'MITRE ATT&CK' })]);
  });

  it('warns and omits threat when every framework fails to resolve', async () => {
    mockModelResponse({ tactics: ['TA0001'], techniques: [{ id: 'T1078' }] });
    const node = buildNode(jest.fn().mockRejectedValue(new Error('boom')));

    const result = await node(buildState());

    expect(result.warnings).toEqual([expect.stringContaining('Failed to add MITRE mappings')]);
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
