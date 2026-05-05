/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enrichEvents } from '.';
import { searchEnrichments } from './search_enrichments';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import { createAlert } from './__mocks__/alerts';

import { isIndexExist } from './utils/is_index_exist';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';

import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import type { ExperimentalFeatures } from '../../../../../../common';

jest.mock('./search_enrichments', () => ({
  searchEnrichments: jest.fn(),
}));
const mockSearchEnrichments = searchEnrichments as jest.Mock;

jest.mock('./utils/is_index_exist', () => ({
  isIndexExist: jest.fn(),
}));
const mockIsIndexExist = isIndexExist as jest.Mock;

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    getEuidFromObject: jest.fn(),
  },
}));
const mockGetEuidFromObject = euid.getEuidFromObject as jest.Mock;

const hostEnrichmentResponse = [
  {
    fields: {
      'host.name': ['host name 1'],
      'host.risk.calculated_level': ['Low'],
      'host.risk.calculated_score_norm': [20],
    },
  },
  {
    fields: {
      'host.name': ['host name 3'],
      'host.risk.calculated_level': ['Critical'],
      'host.risk.calculated_score_norm': [90],
    },
  },
];

const userEnrichmentResponse = [
  {
    fields: {
      'user.name': ['user name 1'],
      'user.risk.calculated_level': ['Moderate'],
      'user.risk.calculated_score_norm': [50],
    },
  },
  {
    fields: {
      'user.name': ['user name 2'],
      'user.risk.calculated_level': ['Critical'],
      'user.risk.calculated_score_norm': [90],
    },
  },
];

const serviceEnrichmentResponse = [
  {
    fields: {
      'service.name': ['service name 1'],
      'service.risk.calculated_level': ['Moderate'],
      'service.risk.calculated_score_norm': [50],
    },
  },
  {
    fields: {
      'service.name': ['service name 2'],
      'service.risk.calculated_level': ['Critical'],
      'service.risk.calculated_score_norm': [90],
    },
  },
];

const assetCriticalityUserResponse = [
  {
    fields: {
      id_value: ['user name 1'],
      criticality_level: ['important'],
    },
  },
];

const assetCriticalityHostResponse = [
  {
    fields: {
      id_value: ['host name 2'],
      criticality_level: ['extremely_critical'],
    },
  },
  {
    fields: {
      id_value: ['host name 1'],
      criticality_level: ['low'],
    },
  },
];

const assetCriticalityServiceResponse = [
  {
    fields: {
      id_value: ['service name 1'],
      criticality_level: ['high'],
    },
  },
];

describe('enrichEvents', () => {
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;
  let ruleServices: PersistenceExecutorOptionsMock;
  const createEntity = (entity: string, name: string) => ({
    [entity]: { name },
  });
  beforeEach(() => {
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
    ruleServices = createPersistenceExecutorOptionsMock();
  });
  afterEach(() => {
    mockIsIndexExist.mockClear();
    mockGetEuidFromObject.mockReset();
  });

  describe(`with entityAnalyticsEntityStoreV2 = false`, () => {
    it('return the same events, if risk indexes are not available', async () => {
      mockSearchEnrichments.mockImplementation(() => []);
      mockIsIndexExist.mockImplementation(() => false);
      const events = [
        createAlert('1', createEntity('host', 'host name')),
        createAlert('2', createEntity('user', 'user name')),
      ];
      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events,
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: false,
        } as unknown as ExperimentalFeatures,
      });

      expect(enrichedEvents).toEqual(events);
    });

    it('return the same events, if there no fields', async () => {
      mockSearchEnrichments.mockImplementation(() => []);
      mockIsIndexExist.mockImplementation(() => true);
      const events = [createAlert('1'), createAlert('2')];
      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events,
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: false,
        } as unknown as ExperimentalFeatures,
      });

      expect(enrichedEvents).toEqual(events);
    });

    it('return enriched events with risk score', async () => {
      mockSearchEnrichments
        .mockReturnValueOnce(hostEnrichmentResponse)
        .mockReturnValueOnce(userEnrichmentResponse)
        .mockReturnValueOnce(serviceEnrichmentResponse);
      mockIsIndexExist.mockImplementation(() => true);

      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events: [
          createAlert('1', {
            ...createEntity('host', 'host name 1'),
            ...createEntity('user', 'user name 1'),
            ...createEntity('service', 'service name 1'),
          }),
          createAlert('2', createEntity('service', 'service name 2')),
        ],
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: false,
        } as unknown as ExperimentalFeatures,
      });

      expect(enrichedEvents).toEqual([
        createAlert('1', {
          host: {
            name: 'host name 1',
            risk: {
              calculated_level: 'Low',
              calculated_score_norm: 20,
            },
          },
          user: {
            name: 'user name 1',
            risk: {
              calculated_level: 'Moderate',
              calculated_score_norm: 50,
            },
          },
          service: {
            name: 'service name 1',
            risk: {
              calculated_level: 'Moderate',
              calculated_score_norm: 50,
            },
          },
        }),
        createAlert('2', {
          service: {
            name: 'service name 2',
            risk: {
              calculated_level: 'Critical',
              calculated_score_norm: 90,
            },
          },
        }),
      ]);
    });

    it('return enriched events with asset criticality', async () => {
      mockSearchEnrichments
        .mockReturnValueOnce(assetCriticalityHostResponse)
        .mockReturnValueOnce(assetCriticalityUserResponse)
        .mockReturnValueOnce(assetCriticalityServiceResponse);

      // disable risk score enrichments
      mockIsIndexExist.mockImplementationOnce(() => false);
      // enable for asset criticality
      mockIsIndexExist.mockImplementation(() => true);

      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events: [
          createAlert('1', {
            ...createEntity('host', 'host name 1'),
            ...createEntity('user', 'user name 1'),
            ...createEntity('service', 'service name 1'),
          }),
          createAlert('2', createEntity('host', 'user name 1')),
        ],
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: false,
        } as unknown as ExperimentalFeatures,
      });

      expect(enrichedEvents).toEqual([
        createAlert('1', {
          ...createEntity('user', 'user name 1'),
          ...createEntity('host', 'host name 1'),
          ...createEntity('service', 'service name 1'),
          'host.asset.criticality': 'low',
          'user.asset.criticality': 'important',
          'service.asset.criticality': 'high',
        }),
        createAlert('2', {
          ...createEntity('host', 'user name 1'),
        }),
      ]);
    });

    it('if some enrichments failed, another work as expected', async () => {
      mockSearchEnrichments
        .mockImplementationOnce(() => {
          throw new Error('1');
        })
        .mockImplementationOnce(() => userEnrichmentResponse);
      mockIsIndexExist.mockImplementation(() => true);

      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events: [
          createAlert('1', {
            ...createEntity('host', 'host name 1'),
            ...createEntity('user', 'user name 1'),
          }),
          createAlert('2', createEntity('user', 'user name 2')),
        ],
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: false,
        } as unknown as ExperimentalFeatures,
      });

      expect(enrichedEvents).toEqual([
        createAlert('1', {
          host: {
            name: 'host name 1',
          },
          user: {
            name: 'user name 1',
            risk: {
              calculated_level: 'Moderate',
              calculated_score_norm: 50,
            },
          },
        }),
        createAlert('2', {
          user: {
            name: 'user name 2',
            risk: {
              calculated_level: 'Critical',
              calculated_score_norm: 90,
            },
          },
        }),
      ]);
    });
  });

  describe(`with entityAnalyticsEntityStoreV2 = true`, () => {
    let mockListEntities: jest.Mock;
    let entityStoreCrudClient: EntityStoreCRUDClient;

    beforeEach(() => {
      mockListEntities = jest.fn().mockResolvedValue({ entities: [] });
      entityStoreCrudClient = {
        listEntities: mockListEntities,
      } as unknown as EntityStoreCRUDClient;
      mockGetEuidFromObject.mockImplementation(
        (entityType: string, source: Record<string, { name?: string } | undefined>) => {
          const name = source?.[entityType]?.name;
          return name ? `${entityType}:${name}` : undefined;
        }
      );
    });

    it('return the same events, if entityStoreCrudClient is undefined', async () => {
      mockIsIndexExist.mockImplementation(() => true);
      const events = [
        createAlert('1', createEntity('host', 'host name')),
        createAlert('2', createEntity('user', 'user name')),
      ];
      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events,
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: true,
        } as unknown as ExperimentalFeatures,
      });

      expect(enrichedEvents).toEqual(events);
      expect(ruleExecutionLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('entityStoreCrudClient')
      );
    });

    it('return the same events, if entity store index is not available', async () => {
      mockIsIndexExist.mockImplementation(() => false);
      const events = [
        createAlert('1', createEntity('host', 'host name')),
        createAlert('2', createEntity('user', 'user name')),
      ];
      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events,
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: true,
        } as unknown as ExperimentalFeatures,
        entityStoreCrudClient,
      });

      expect(enrichedEvents).toEqual(events);
      expect(mockListEntities).not.toHaveBeenCalled();
    });

    it('return the same events, if there are no fields', async () => {
      mockListEntities.mockImplementation(
        ({ filter }: { filter: { terms: { 'entity.id': string[] } } }) => {
          const requestedIds = filter?.terms?.['entity.id'] ?? [];
          const entities: Array<{ entity: { id: string } }> = [];
          const fieldsList: Array<Record<string, unknown[]>> = [];
          for (const euidStr of requestedIds) {
            entities.push({ entity: { id: euidStr } });
            fieldsList.push({});
          }
          return Promise.resolve({ entities, fields: fieldsList });
        }
      );
      mockIsIndexExist.mockImplementation(() => true);
      const events = [createAlert('1'), createAlert('2')];
      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events,
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: true,
        } as unknown as ExperimentalFeatures,
        entityStoreCrudClient,
      });

      expect(enrichedEvents).toEqual(events);
      expect(mockListEntities).not.toHaveBeenCalled();
    });

    it('return enriched events with risk score', async () => {
      mockIsIndexExist.mockImplementation(() => true);

      const riskByEuid: Record<string, Record<string, unknown[]>> = {
        'host:host name 1': {
          'entity.risk.calculated_level': ['Low'],
          'entity.risk.calculated_score_norm': [20],
        },
        'user:user name 1': {
          'entity.risk.calculated_level': ['Moderate'],
          'entity.risk.calculated_score_norm': [50],
        },
        'service:service name 1': {
          'entity.risk.calculated_level': ['Moderate'],
          'entity.risk.calculated_score_norm': [50],
        },
        'service:service name 2': {
          'entity.risk.calculated_level': ['Critical'],
          'entity.risk.calculated_score_norm': [90],
        },
      };

      mockListEntities.mockImplementation(
        ({
          filter,
          fields,
        }: {
          filter: { terms: { 'entity.id': string[] } };
          fields: string[];
        }) => {
          if (!fields.includes('entity.risk.calculated_level')) {
            return Promise.resolve({ entities: [] });
          }
          const requestedIds = filter?.terms?.['entity.id'] ?? [];
          const entities: Array<{ entity: { id: string } }> = [];
          const fieldsList: Array<Record<string, unknown[]>> = [];
          for (const euidStr of requestedIds) {
            if (riskByEuid[euidStr]) {
              entities.push({ entity: { id: euidStr } });
              fieldsList.push(riskByEuid[euidStr]);
            }
          }
          return Promise.resolve({ entities, fields: fieldsList });
        }
      );

      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events: [
          createAlert('1', {
            ...createEntity('host', 'host name 1'),
            ...createEntity('user', 'user name 1'),
            ...createEntity('service', 'service name 1'),
          }),
          createAlert('2', createEntity('service', 'service name 2')),
        ],
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: true,
        } as unknown as ExperimentalFeatures,
        entityStoreCrudClient,
      });

      expect(enrichedEvents).toEqual([
        createAlert('1', {
          host: {
            name: 'host name 1',
            risk: {
              calculated_level: 'Low',
              calculated_score_norm: 20,
            },
          },
          user: {
            name: 'user name 1',
            risk: {
              calculated_level: 'Moderate',
              calculated_score_norm: 50,
            },
          },
          service: {
            name: 'service name 1',
            risk: {
              calculated_level: 'Moderate',
              calculated_score_norm: 50,
            },
          },
        }),
        createAlert('2', {
          service: {
            name: 'service name 2',
            risk: {
              calculated_level: 'Critical',
              calculated_score_norm: 90,
            },
          },
        }),
      ]);
    });

    it('return enriched events with asset criticality', async () => {
      mockIsIndexExist.mockImplementation(() => true);

      const criticalityByEuid: Record<string, Record<string, unknown[]>> = {
        'host:host name 1': { 'asset.criticality': ['low'] },
        'user:user name 1': { 'asset.criticality': ['important'] },
        'service:service name 1': { 'asset.criticality': ['high'] },
      };

      mockListEntities.mockImplementation(
        ({
          filter,
          fields,
        }: {
          filter: { terms: { 'entity.id': string[] } };
          fields: string[];
        }) => {
          if (!fields.includes('asset.criticality')) {
            return Promise.resolve({ entities: [] });
          }
          const requestedIds = filter?.terms?.['entity.id'] ?? [];
          const entities: Array<{ entity: { id: string } }> = [];
          const fieldsList: Array<Record<string, unknown[]>> = [];
          for (const euidStr of requestedIds) {
            if (criticalityByEuid[euidStr]) {
              entities.push({ entity: { id: euidStr } });
              fieldsList.push(criticalityByEuid[euidStr]);
            }
          }
          return Promise.resolve({ entities, fields: fieldsList });
        }
      );

      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events: [
          createAlert('1', {
            ...createEntity('host', 'host name 1'),
            ...createEntity('user', 'user name 1'),
            ...createEntity('service', 'service name 1'),
          }),
          createAlert('2', createEntity('host', 'user name 1')),
        ],
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: true,
        } as unknown as ExperimentalFeatures,
        entityStoreCrudClient,
      });

      expect(enrichedEvents).toEqual([
        createAlert('1', {
          ...createEntity('user', 'user name 1'),
          ...createEntity('host', 'host name 1'),
          ...createEntity('service', 'service name 1'),
          'host.asset.criticality': 'low',
          'user.asset.criticality': 'important',
          'service.asset.criticality': 'high',
        }),
        createAlert('2', {
          ...createEntity('host', 'user name 1'),
        }),
      ]);
    });

    it('if some enrichments failed, another work as expected', async () => {
      mockIsIndexExist.mockImplementation(() => true);

      const userRiskByEuid: Record<string, Record<string, unknown[]>> = {
        'user:user name 1': {
          'entity.risk.calculated_level': ['Moderate'],
          'entity.risk.calculated_score_norm': [50],
        },
        'user:user name 2': {
          'entity.risk.calculated_level': ['Critical'],
          'entity.risk.calculated_score_norm': [90],
        },
      };

      mockListEntities.mockImplementation(
        ({
          filter,
          fields,
        }: {
          filter: { terms: { 'entity.id': string[] } };
          fields: string[];
        }) => {
          const requestedIds = filter?.terms?.['entity.id'] ?? [];
          if (requestedIds.some((id) => id.startsWith('host:'))) {
            throw new Error('host enrichment failed');
          }
          if (
            fields.includes('entity.risk.calculated_level') &&
            requestedIds.some((id) => id.startsWith('user:'))
          ) {
            const entities: Array<{ entity: { id: string } }> = [];
            const fieldsList: Array<Record<string, unknown[]>> = [];
            for (const euidStr of requestedIds) {
              if (userRiskByEuid[euidStr]) {
                entities.push({ entity: { id: euidStr } });
                fieldsList.push(userRiskByEuid[euidStr]);
              }
            }
            return Promise.resolve({ entities, fields: fieldsList });
          }
          return Promise.resolve({ entities: [] });
        }
      );

      const enrichedEvents = await enrichEvents({
        logger: ruleExecutionLogger,
        services: ruleServices,
        events: [
          createAlert('1', {
            ...createEntity('host', 'host name 1'),
            ...createEntity('user', 'user name 1'),
          }),
          createAlert('2', createEntity('user', 'user name 2')),
        ],
        spaceId: 'default',
        experimentalFeatures: {
          entityAnalyticsEntityStoreV2: true,
        } as unknown as ExperimentalFeatures,
        entityStoreCrudClient,
      });

      expect(enrichedEvents).toEqual([
        createAlert('1', {
          host: {
            name: 'host name 1',
          },
          user: {
            name: 'user name 1',
            risk: {
              calculated_level: 'Moderate',
              calculated_score_norm: 50,
            },
          },
        }),
        createAlert('2', {
          user: {
            name: 'user name 2',
            risk: {
              calculated_level: 'Critical',
              calculated_score_norm: 90,
            },
          },
        }),
      ]);
    });
  });
});
