/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MitreAttackEnrichment } from './mitre_attack_enrichment';
import type { ExtractedEntity, PipelineConfig } from '../types';
import { DEFAULT_PIPELINE_CONFIG } from '../types';

const createMockEsClient = () => ({
  search: jest.fn(),
});

const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  get: jest.fn(),
  isLevelEnabled: jest.fn().mockReturnValue(true),
  log: jest.fn(),
});

const makeEntity = (overrides: Partial<ExtractedEntity> = {}): ExtractedEntity => ({
  typeKey: 'hostname',
  value: 'host-1',
  sourceField: 'host.name',
  alertId: 'alert-1',
  ...overrides,
});

const makeThreatSource = (
  tactic: string,
  techniqueId: string,
  techniqueName: string,
  subtechniques?: Array<{ id: string; name: string }>
) => ({
  kibana: {
    alert: {
      rule: {
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { name: tactic },
            technique: [
              {
                id: techniqueId,
                name: techniqueName,
                ...(subtechniques ? { subtechnique: subtechniques } : {}),
              },
            ],
          },
        ],
      },
    },
  },
});

describe('MitreAttackEnrichment', () => {
  let esClient: ReturnType<typeof createMockEsClient>;
  let logger: ReturnType<typeof createMockLogger>;
  let enrichment: MitreAttackEnrichment;
  const config: PipelineConfig = DEFAULT_PIPELINE_CONFIG;

  beforeEach(() => {
    esClient = createMockEsClient();
    logger = createMockLogger();
    enrichment = new MitreAttackEnrichment(esClient as never, 'default');
    jest.clearAllMocks();
  });

  it('has correct id and name', () => {
    expect(enrichment.id).toBe('mitre_attack');
    expect(enrichment.name).toBe('MITRE ATT&CK Correlation');
  });

  it('returns empty result for no entities', async () => {
    const result = await enrichment.enrich({
      entities: [],
      config,
      logger: logger as never,
    });

    expect(result.enrichedEntities).toEqual([]);
    expect(result.stats.totalEnriched).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('enriches entities with MITRE technique metadata', async () => {
    const entities = [makeEntity({ alertId: 'alert-1' })];

    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _source: makeThreatSource('Execution', 'T1059', 'Command and Scripting Interpreter'),
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: { hits: [] },
      });

    const result = await enrichment.enrich({
      entities,
      config,
      logger: logger as never,
    });

    expect(result.stats.totalEnriched).toBe(1);
    expect(result.stats.bySource).toEqual({ mitre_attack: 1 });

    const enriched = result.enrichedEntities[0];
    expect(enriched.enrichments).toHaveLength(1);
    expect(enriched.enrichments![0]).toEqual(
      expect.objectContaining({
        source: 'mitre_attack',
        type: 'mitre_attack',
        details: expect.objectContaining({
          techniques: [
            { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' },
          ],
          tactics: ['Execution'],
          multi_technique: false,
        }),
      })
    );
  });

  it('detects subtechniques in the threat field', async () => {
    const entities = [makeEntity({ alertId: 'alert-1' })];

    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _source: makeThreatSource('Execution', 'T1059', 'Command and Scripting Interpreter', [
                { id: 'T1059.001', name: 'PowerShell' },
              ]),
            },
          ],
        },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const result = await enrichment.enrich({
      entities,
      config,
      logger: logger as never,
    });

    const details = result.enrichedEntities[0].enrichments![0].details as Record<string, unknown>;
    const techniques = details.techniques as Array<Record<string, unknown>>;
    expect(techniques).toHaveLength(2);
    expect(techniques[1]).toEqual(
      expect.objectContaining({ id: 'T1059.001', name: 'PowerShell', subtechnique: 'T1059' })
    );
  });

  it('assigns critical severity for multi-step attack chains', async () => {
    const entities = [
      makeEntity({ alertId: 'alert-1', typeKey: 'hostname', value: 'host-1' }),
      makeEntity({ alertId: 'alert-2', typeKey: 'user', value: 'admin' }),
    ];

    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _source: makeThreatSource('Lateral Movement', 'T1021', 'Remote Services'),
            },
            {
              _id: 'alert-2',
              _source: makeThreatSource('Lateral Movement', 'T1570', 'Lateral Tool Transfer'),
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-neighbor-1',
              _source: makeThreatSource('Lateral Movement', 'T1080', 'Taint Shared Content'),
            },
            {
              _id: 'alert-neighbor-2',
              _source: makeThreatSource(
                'Lateral Movement',
                'T1550',
                'Use Alternate Authentication Material'
              ),
            },
          ],
        },
      });

    const result = await enrichment.enrich({
      entities,
      config,
      logger: logger as never,
    });

    expect(result.stats.totalEnriched).toBe(2);
    expect(result.enrichedEntities[0].enrichments![0].severity).toBe('critical');
  });

  it('skips entities whose alerts have no MITRE threat mapping', async () => {
    const entities = [
      makeEntity({ alertId: 'alert-1' }),
      makeEntity({ alertId: 'alert-2', value: 'host-2' }),
    ];

    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _source: makeThreatSource('Execution', 'T1059', 'Command and Scripting Interpreter'),
            },
            {
              _id: 'alert-2',
              _source: { kibana: { alert: { rule: {} } } },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const result = await enrichment.enrich({
      entities,
      config,
      logger: logger as never,
    });

    expect(result.stats.totalEnriched).toBe(1);
    expect(result.enrichedEntities[0].enrichments).toHaveLength(1);
    expect(result.enrichedEntities[1].enrichments).toBeUndefined();
  });

  it('handles ES search failures gracefully', async () => {
    const entities = [makeEntity()];

    esClient.search.mockRejectedValue(new Error('index_not_found'));

    const result = await enrichment.enrich({
      entities,
      config,
      logger: logger as never,
    });

    expect(result.stats.totalEnriched).toBe(0);
    expect(result.enrichedEntities).toHaveLength(1);
    expect(result.enrichedEntities[0].enrichments).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('MITRE technique lookup failed')
    );
  });

  it('handles chain discovery failure gracefully (still enriches with technique data)', async () => {
    const entities = [makeEntity({ alertId: 'alert-1', typeKey: 'hostname' })];

    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _source: makeThreatSource('Execution', 'T1059', 'Command and Scripting Interpreter'),
            },
          ],
        },
      })
      .mockRejectedValueOnce(new Error('search_phase_execution_exception'));

    const result = await enrichment.enrich({
      entities,
      config,
      logger: logger as never,
    });

    expect(result.stats.totalEnriched).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('MITRE chain discovery failed')
    );
  });

  it('uses space-specific alert index', async () => {
    const spaceInstance = new MitreAttackEnrichment(esClient as never, 'my-space');
    const entities = [makeEntity()];

    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } });

    await spaceInstance.enrich({
      entities,
      config,
      logger: logger as never,
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.alerts-security.alerts-my-space',
      })
    );
  });

  it('ignores non-MITRE ATT&CK frameworks', async () => {
    const entities = [makeEntity({ alertId: 'alert-1' })];

    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'alert-1',
            _source: {
              kibana: {
                alert: {
                  rule: {
                    threat: [
                      {
                        framework: 'Custom Framework',
                        tactic: { name: 'SomeTactic' },
                        technique: [{ id: 'CF001', name: 'SomeTech' }],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    });

    const result = await spaceEnrichment(esClient, 'default', entities, config, logger);

    expect(result.stats.totalEnriched).toBe(0);
  });
});

function spaceEnrichment(
  esClient: ReturnType<typeof createMockEsClient>,
  spaceId: string,
  entities: ExtractedEntity[],
  config: PipelineConfig,
  logger: ReturnType<typeof createMockLogger>
) {
  const e = new MitreAttackEnrichment(esClient as never, spaceId);
  return e.enrich({ entities, config, logger: logger as never });
}
