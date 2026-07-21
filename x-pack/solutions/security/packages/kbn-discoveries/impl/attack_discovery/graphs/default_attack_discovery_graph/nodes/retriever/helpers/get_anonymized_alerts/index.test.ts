/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { getOpenAndAcknowledgedAlertsQuery } from '@kbn/elastic-assistant-common';

const MIN_SIZE = 10;

import { getAnonymizedAlerts } from '.';
import { mockOpenAndAcknowledgedAlertsQueryResults } from '../../../../mock/mock_open_and_acknowledged_alerts_query_results';

jest.mock('@kbn/elastic-assistant-common', () => {
  const original = jest.requireActual('@kbn/elastic-assistant-common');

  return {
    ...original,
    getOpenAndAcknowledgedAlertsQuery: jest.fn(),
  };
});

describe('getAnonymizedAlerts', () => {
  const alertsIndexPattern = '.alerts-security.alerts-default';
  const mockAnonymizationFields = [
    {
      id: '9f95b649-f20e-4edf-bd76-1d21ab6f8e2e',
      timestamp: '2024-05-06T22:16:48.489Z',
      field: '_id',
      allowed: true,
      anonymized: false,
      createdAt: '2024-05-06T22:16:48.489Z',
      namespace: 'default',
    },
    {
      id: '22f23471-4f6a-4cec-9b2a-cf270ffb53d5',
      timestamp: '2024-05-06T22:16:48.489Z',
      field: 'host.name',
      allowed: true,
      anonymized: true,
      createdAt: '2024-05-06T22:16:48.489Z',
      namespace: 'default',
    },
  ];
  const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const mockReplacements = {
    replacement1: 'SRVMAC08',
    replacement2: 'SRVWIN01',
    replacement3: 'SRVWIN02',
  };
  const size = 10;

  beforeEach(() => {
    jest.clearAllMocks();

    (mockEsClient.search as unknown as jest.Mock).mockResolvedValue(
      mockOpenAndAcknowledgedAlertsQueryResults
    );
  });

  it('returns an empty array when alertsIndexPattern is not provided', async () => {
    const result = await getAnonymizedAlerts({
      esClient: mockEsClient,
      size,
    });

    expect(result).toEqual([]);
  });

  it('should return an empty array when size is not provided', async () => {
    const result = await getAnonymizedAlerts({
      alertsIndexPattern,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('should return an empty array when size is out of range', async () => {
    const outOfRange = MIN_SIZE - 1;

    const result = await getAnonymizedAlerts({
      alertsIndexPattern,
      esClient: mockEsClient,
      size: outOfRange,
    });

    expect(result).toEqual([]);
  });

  it('calls getOpenAndAcknowledgedAlertsQuery with the provided anonymizationFields', async () => {
    await getAnonymizedAlerts({
      alertsIndexPattern,
      anonymizationFields: mockAnonymizationFields,
      esClient: mockEsClient,
      replacements: mockReplacements,
      size,
    });

    expect(getOpenAndAcknowledgedAlertsQuery).toHaveBeenCalledWith({
      alertsIndexPattern,
      anonymizationFields: mockAnonymizationFields,
      size,
    });
  });

  it('calls getOpenAndAcknowledgedAlertsQuery with empty anonymizationFields when they are NOT provided', async () => {
    await getAnonymizedAlerts({
      alertsIndexPattern,
      esClient: mockEsClient,
      replacements: mockReplacements,
      size,
    });

    expect(getOpenAndAcknowledgedAlertsQuery).toHaveBeenCalledWith({
      alertsIndexPattern,
      anonymizationFields: [],
      size,
    });
  });

  it('calls getOpenAndAcknowledgedAlertsQuery with the optional filter parameters', async () => {
    const start = '2025-01-01T00:00:00.000Z';
    const end = '2025-01-02T00:00:00.000Z';
    const filter = {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'user.name': 'root',
            },
          },
        ],
        should: [],
        must_not: [
          {
            match_phrase: {
              'host.name': 'foo',
            },
          },
        ],
      },
    };

    await getAnonymizedAlerts({
      alertsIndexPattern,
      end,
      esClient: mockEsClient,
      filter,
      replacements: mockReplacements,
      size,
      start,
    });

    expect(getOpenAndAcknowledgedAlertsQuery).toHaveBeenCalledWith({
      alertsIndexPattern,
      anonymizationFields: [],
      end,
      filter,
      size,
      start,
    });
  });

  it('returns the expected transformed (anonymized) raw data', async () => {
    const result = await getAnonymizedAlerts({
      alertsIndexPattern,
      anonymizationFields: mockAnonymizationFields,
      esClient: mockEsClient,
      replacements: mockReplacements,
      size,
    });

    expect(result).toEqual([
      '_id,b6e883c29b32571aaa667fa13e65bbb4f95172a2b84bdfb85d6f16c72b2d2560\nhost.name,replacement1',
      '_id,0215a6c5cc9499dd0290cd69a4947efb87d3ddd8b6385a766d122c2475be7367\nhost.name,replacement1',
      '_id,600eb9eca925f4c5b544b4e9d3cf95d83b7829f8f74c5bd746369cb4c2968b9a\nhost.name,replacement1',
      '_id,e1f4a4ed70190eb4bd256c813029a6a9101575887cdbfa226ac330fbd3063f0c\nhost.name,replacement1',
      '_id,2a7a4809ca625dfe22ccd35fbef7a7ba8ed07f109e5cbd17250755cfb0bc615f\nhost.name,replacement1',
      '_id,2a9f7602de8656d30dda0ddcf79e78037ac2929780e13d5b2047b3bedc40bb69\nhost.name,replacement1',
      '_id,4615c3a90e8057ae5cc9b358bbbf4298e346277a2f068dda052b0b43ef6d5bbd\nhost.name,replacement1',
      '_id,449322a72d3f19efbdf983935a1bdd21ebd6b9c761ce31e8b252003017d7e5db\nhost.name,replacement1',
      '_id,f465ca9fbfc8bc3b1871e965c9e111cac76ff3f4076fed6bc9da88d49fb43014\nhost.name,replacement3',
      '_id,aa283e6a13be77b533eceffb09e48254c8f91feeccc39f7eed80fd3881d053f4\nhost.name,replacement3',
      '_id,dd9e4ea23961ccfdb7a9c760ee6bedd19a013beac3b0d38227e7ae77ba4ce515\nhost.name,replacement3',
      '_id,f30d55e503b1d848b34ee57741b203d8052360dd873ea34802f3fa7a9ef34d0a\nhost.name,replacement3',
      '_id,6f8cd5e8021dbb64598f2b7ec56bee21fd00d1e62d4e08905f86bf234873ee66\nhost.name,replacement3',
      '_id,ce110da958fe0cf0c07599a21c68d90a64c93b7607aa27970a614c7f49598316\nhost.name,replacement3',
      '_id,0866787b0027b4d908767ac16e35a1da00970c83632ba85be65f2ad371132b4f\nhost.name,replacement3',
      '_id,b0fdf96721e361e1137d49a67e26d92f96b146392d7f44322bddc3d660abaef1\nhost.name,replacement3',
      '_id,7b4f49f21cf141e67856d3207fb4ea069c8035b41f0ea501970694cf8bd43cbe\nhost.name,replacement3',
      '_id,ea81d79104cbd442236b5bcdb7a3331de897aa4ce1523e622068038d048d0a9e\nhost.name,replacement3',
      '_id,cdf3b5510bb5ed622e8cefd1ce6bedc52bdd99a4c1ead537af0603469e713c8b\nhost.name,replacement2',
      '_id,6abe81eb6350fb08031761be029e7ab19f7e577a7c17a9c5ea1ed010ba1620e3\nhost.name,replacement2',
    ]);
  });

  it('calls onNewReplacements for every alert', async () => {
    const onNewReplacements = jest.fn();

    await getAnonymizedAlerts({
      alertsIndexPattern,
      anonymizationFields: mockAnonymizationFields,
      esClient: mockEsClient,
      onNewReplacements,
      replacements: mockReplacements,
      size,
    });

    expect(onNewReplacements).toHaveBeenCalledTimes(20); // 20 alerts in mockOpenAndAcknowledgedAlertsQueryResults
  });
});
