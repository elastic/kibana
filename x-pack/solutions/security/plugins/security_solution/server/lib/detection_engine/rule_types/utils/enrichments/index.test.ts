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

import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

jest.mock('./search_enrichments', () => ({
  searchEnrichments: jest.fn(),
}));
const mockSearchEnrichments = searchEnrichments as jest.Mock;

jest.mock('./utils/is_index_exist', () => ({
  isIndexExist: jest.fn(),
}));
const mockIsIndexExist = isIndexExist as jest.Mock;

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
  });

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
      .mockReturnValueOnce(assetCriticalityUserResponse)
      .mockReturnValueOnce(assetCriticalityHostResponse)
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
