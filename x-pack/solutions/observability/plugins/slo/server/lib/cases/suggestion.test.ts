/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOByServiceName } from './suggestion';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';

jest.mock('../../../common', () => ({
  sloPaths: {
    sloDetailsHistory: jest.fn().mockReturnValue('/mock/slo/path'),
  },
}));

const mockSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });

const loggerMock = { debug: jest.fn() } as unknown as Logger;
const coreStart = {
  elasticsearch: {
    client: {
      asScoped: jest.fn().mockReturnValue({
        asCurrentUser: {
          search: (...args: unknown[]) => mockSearch(...args),
        },
      }),
    },
  },
} as unknown as CoreStart;

describe('getSLOByServiceName', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty suggestions when service.name is missing', async () => {
    const handler = getSLOByServiceName(coreStart, loggerMock).handlers.searchSLOByServiceName
      .handler;

    const res = await handler({
      context: { spaceId: 'default' },
      request: {} as KibanaRequest,
    });

    expect(mockSearch).not.toHaveBeenCalled();
    expect(res).toEqual({ suggestions: [] });
  });

  test('builds a suggestion for each returned SLO', async () => {
    const hits = [
      {
        _source: {
          slo: {
            id: 'slo-1',
            instanceId: 'inst-1',
            name: 'Latency SLO',
            groupings: { service: { name: 'synth-service-0' } },
          },
          status: 'DEGRADING',
        },
      },
      {
        _source: {
          slo: {
            id: 'slo-2',
            instanceId: 'inst-2',
            name: 'Another SLO',
            groupings: { service: { name: 'synth-service-1' } },
          },
          status: 'VIOLATED',
        },
      },
    ];
    mockSearch.mockResolvedValue({ hits: { hits } });

    const handler = getSLOByServiceName(coreStart, loggerMock).handlers.searchSLOByServiceName
      .handler;

    const res = await handler({
      context: { spaceId: 'default', 'service.name': ['synth-service-0', 'synth-service-1'] },
      request: {} as KibanaRequest,
    });

    expect(mockSearch).toHaveBeenCalledWith({
      index: '.slo-observability.summary-v3*',
      size: 10,
      sort: [{ summaryUpdatedAt: { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            {
              terms: { 'slo.groupings.service.name': ['synth-service-0', 'synth-service-1'] },
            },
            { term: { spaceId: 'default' } },
          ],
          must_not: [
            {
              term: {
                status: {
                  value: 'NO_DATA',
                },
              },
            },
            {
              term: {
                isTempDoc: {
                  value: true,
                },
              },
            },
          ],
        },
      },
    });

    expect(res.suggestions).toHaveLength(2);
    expect(res.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'slo-1-inst-1',
          componentId: 'slo',
          data: [
            {
              description: 'SLO "Latency SLO" is DEGRADING for the service "synth-service-0"',
              payload: { id: 'slo-1', instanceId: 'inst-1' },
              attachment: expect.objectContaining({
                type: 'persistableState',
                persistableStateAttachmentTypeId: '.page',
                persistableStateAttachmentState: expect.objectContaining({
                  type: 'slo_history',
                  url: expect.objectContaining({
                    pathAndQuery: '/mock/slo/path',
                    label: 'Latency SLO',
                  }),
                }),
              }),
            },
          ],
        }),
        expect.objectContaining({
          id: 'slo-2-inst-2',
          componentId: 'slo',
          data: [
            expect.objectContaining({
              description: 'SLO "Another SLO" is VIOLATED for the service "synth-service-1"',
              payload: { id: 'slo-2', instanceId: 'inst-2' },
              attachment: expect.objectContaining({
                type: 'persistableState',
                persistableStateAttachmentTypeId: '.page',
                persistableStateAttachmentState: expect.objectContaining({
                  type: 'slo_history',
                  url: expect.objectContaining({
                    pathAndQuery: '/mock/slo/path',
                    label: 'Another SLO',
                  }),
                }),
              }),
            }),
          ],
        }),
      ])
    );
  });
});
