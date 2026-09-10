/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { deduplicateAttackDiscoveries as deduplicateAttackDiscoveriesShared } from '@kbn/attack-discovery-schedules-common';

import { deduplicateAttackDiscoveries } from '.';
import { mockAttackDiscoveries } from '../../evaluation/__mocks__/mock_attack_discoveries';

jest.mock('@kbn/attack-discovery-schedules-common', () => ({
  ...jest.requireActual('@kbn/attack-discovery-schedules-common'),
  deduplicateAttackDiscoveries: jest.fn(),
}));

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();

describe('deduplicateAttackDiscoveries', () => {
  const ownerInfo = {
    id: 'test-owner-1',
    isSchedule: false,
  };
  const defaultProps = {
    attackDiscoveries: mockAttackDiscoveries,
    connectorId: 'test-connector-1',
    esClient: mockEsClient,
    indexPattern: '.test.alerts-*,.adhoc.alerts-*',
    logger: mockLogger,
    ownerInfo,
    replacements: undefined,
    spaceId: 'test-space',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (deduplicateAttackDiscoveriesShared as jest.Mock).mockResolvedValue(mockAttackDiscoveries);
  });

  it('delegates to the shared deduplicateAttackDiscoveries with the provided params', async () => {
    await deduplicateAttackDiscoveries(defaultProps);

    expect(deduplicateAttackDiscoveriesShared).toHaveBeenCalledWith(
      expect.objectContaining(defaultProps)
    );
  });

  it('injects a computeSha256Hash that returns the sha256 hex digest', async () => {
    await deduplicateAttackDiscoveries(defaultProps);

    const { computeSha256Hash } = (deduplicateAttackDiscoveriesShared as jest.Mock).mock
      .calls[0][0];

    expect(computeSha256Hash('some-input')).toBe(
      createHash('sha256').update('some-input').digest('hex')
    );
  });

  it('returns the result from the shared deduplicateAttackDiscoveries', async () => {
    const [attack1] = mockAttackDiscoveries;
    (deduplicateAttackDiscoveriesShared as jest.Mock).mockResolvedValue([attack1]);

    const result = await deduplicateAttackDiscoveries(defaultProps);

    expect(result).toEqual([attack1]);
  });
});
