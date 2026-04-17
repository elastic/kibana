/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { parseEventRecords } from './parse';

describe('parseEventRecords', () => {
  it('normalizes metadata, falls back actor names to the entity id, and keeps requested ids order', () => {
    const logger = loggingSystemMock.createLogger();

    const result = parseEventRecords(
      logger,
      [
        {
          docId: 'doc-1',
          index: 'logs-custom-default',
          timestamp: '2024-01-01T00:00:00.000Z',
          action: 'user-login',
          isAlert: false,
          actorEntityId: 'actor-1',
          actorEcsParentField: 'user',
          actorEntityName: null,
          targetEntityId: 'target-1',
          targetEcsParentField: 'host',
          targetEntityName: 'Target Host',
          sourceIps: '1.1.1.1',
          sourceCountryCodes: ['US'],
        },
      ],
      ['doc-1']
    );

    expect(result.events).toEqual([
      {
        id: 'doc-1',
        isAlert: false,
        index: 'logs-custom-default',
        timestamp: '2024-01-01T00:00:00.000Z',
        action: 'user-login',
        actor: {
          id: 'actor-1',
          name: 'actor-1',
          icon: 'user',
        },
        target: {
          id: 'target-1',
          name: 'Target Host',
          icon: 'storage',
        },
        ips: ['1.1.1.1'],
        countryCodes: ['US'],
      },
    ]);
  });

  it('omits actor and target when entity ids are missing', () => {
    const logger = loggingSystemMock.createLogger();

    const result = parseEventRecords(
      logger,
      [
        {
          docId: 'doc-2',
          isAlert: true,
          sourceIps: ['1.1.1.1', '2.2.2.2'],
          sourceCountryCodes: null,
        },
      ],
      ['doc-2']
    );

    expect(result.events).toEqual([
      {
        id: 'doc-2',
        isAlert: true,
        actor: undefined,
        target: undefined,
        ips: ['1.1.1.1', '2.2.2.2'],
        countryCodes: undefined,
      },
    ]);
  });

  it('returns no events when a requested event is not found', () => {
    const logger = loggingSystemMock.createLogger();

    const result = parseEventRecords(logger, [], ['missing-event-id']);

    expect(result.events).toEqual([]);
  });
});
