/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { parseEntityRecords } from './parse';

describe('parseEntityRecords', () => {
  it('returns enriched entities and fallback items for missing IDs', () => {
    const logger = loggingSystemMock.createLogger();

    const result = parseEntityRecords(
      logger,
      [
        {
          entityId: 'entity-1',
          entityName: 'Alice',
          entityType: 'user',
          entitySubType: 'human',
          ecsParentField: 'user',
          availableInEntityStore: true,
          hostIp: '10.0.0.1',
          timestamp: '2024-01-01T00:00:00.000Z',
          sourceIps: '1.1.1.1',
          sourceCountryCodes: ['US'],
        },
      ],
      ['entity-1', 'missing-entity']
    );

    expect(result.entities).toEqual([
      {
        id: 'entity-1',
        name: 'Alice',
        type: 'user',
        subType: 'human',
        ecsParentField: 'user',
        timestamp: '2024-01-01T00:00:00.000Z',
        icon: 'user',
        availableInEntityStore: true,
        host: { ip: '10.0.0.1' },
        ips: ['1.1.1.1'],
        countryCodes: ['US'],
      },
      {
        id: 'missing-entity',
        name: 'missing-entity',
        availableInEntityStore: false,
      },
    ]);
  });

  it('normalizes array-like fields and omits optional host metadata when absent', () => {
    const logger = loggingSystemMock.createLogger();

    const result = parseEntityRecords(
      logger,
      [
        {
          entityId: 'entity-1',
          entityName: 'Host One',
          entityType: 'host',
          ecsParentField: 'host',
          availableInEntityStore: null,
          sourceIps: ['1.1.1.1', '2.2.2.2'],
          sourceCountryCodes: 'US',
        },
      ],
      ['entity-1']
    );

    expect(result.entities).toEqual([
      {
        id: 'entity-1',
        name: 'Host One',
        type: 'host',
        ecsParentField: 'host',
        icon: 'storage',
        availableInEntityStore: false,
        ips: ['1.1.1.1', '2.2.2.2'],
        countryCodes: ['US'],
      },
    ]);
  });
});
