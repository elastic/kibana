/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { getMobileKpis } from './get_mobile_kpis';
import { MOBILE_KPIS_ENDPOINT, mobileRouteRepository } from './route';

jest.mock('./get_mobile_kpis');

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T13:00:00.000Z';

const RESPONSE: MobileKpisResponse = {
  hasData: true,
  sessions: { value: 7, previous: 5, delta: 2 },
  users: { value: 3, previous: 3, delta: 0 },
  crashFreeSessions: { value: null, previous: null, delta: null },
  errorRate: { value: 0.5, previous: null, delta: null },
  releases: ['1.2.3'],
  osNames: ['iOS'],
  platforms: ['ios'],
  environments: ['production'],
  bucket: 'hour',
  esql: 'FROM traces-*.otel-*,logs-*.otel-*',
};

const esClient = { esql: { query: jest.fn() } };

const runHandler = ({
  query = { start: START, end: END },
}: {
  query?: { start: string; end: string; environment?: string; osName?: string; release?: string };
}) => {
  const handler = mobileRouteRepository[MOBILE_KPIS_ENDPOINT].handler as unknown as (
    resources: unknown
  ) => Promise<MobileKpisResponse>;
  return handler({
    params: { path: { serviceName: 'shop-mobile' }, query },
    context: {
      core: Promise.resolve({
        elasticsearch: { client: { asCurrentUser: esClient } },
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    },
    request: { events: { aborted$: NEVER } },
    plugins: {},
    isServerless: false,
    isUxEnabled: true,
    logger: loggingSystemMock.createLogger(),
  });
};

beforeEach(() => {
  jest.mocked(getMobileKpis).mockReset().mockResolvedValue(RESPONSE);
});

describe('mobile KPIs route', () => {
  it('queries the KPIs with the filters and the time range', async () => {
    const response = await runHandler({
      query: {
        start: START,
        end: END,
        environment: 'production',
        osName: 'iPadOS',
        release: '1.2.3',
      },
    });

    expect(response).toBe(RESPONSE);
    expect(jest.mocked(getMobileKpis)).toHaveBeenCalledWith(
      expect.objectContaining({
        // The plugin's traced client, over the user's.
        esClient: expect.objectContaining({ client: esClient }),
        filters: { serviceName: 'shop-mobile', osName: 'iPadOS', release: '1.2.3' },
        start: Date.parse(START),
        end: Date.parse(END),
        environment: 'production',
      })
    );
  });

  describe('params', () => {
    const { params } = mobileRouteRepository[MOBILE_KPIS_ENDPOINT];
    const schema = params as unknown as {
      shape: { query: { safeParse: (query: unknown) => { success: boolean } } };
    };
    const isValid = (query: Record<string, string>) =>
      schema.shape.query.safeParse({ start: START, end: END, ...query }).success;

    it('accepts no filter, an OS and a release', () => {
      expect(isValid({})).toBe(true);
      expect(isValid({ osName: 'iPadOS', release: '1.2.3' })).toBe(true);
    });

    it('rejects a range that starts after it ends, an empty or too long OS, a too long release', () => {
      expect(isValid({ start: END, end: START })).toBe(false);
      expect(isValid({ osName: '' })).toBe(false);
      expect(isValid({ osName: 'x'.repeat(65) })).toBe(false);
      expect(isValid({ release: 'x'.repeat(1025) })).toBe(false);
    });
  });
});
