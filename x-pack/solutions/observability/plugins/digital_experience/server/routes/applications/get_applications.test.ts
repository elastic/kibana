/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { forbidden } from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ApplicationSource, ApplicationSummary } from '../../../common/types/applications';
import { getApplications } from './get_applications';

const app = (
  serviceName: string,
  source: ApplicationSource,
  pageLoads: number
): ApplicationSummary => ({
  serviceName,
  source,
  environments: [],
  pageLoads: { count: pageLoads },
  webVitals: {
    lcp: { p75Ms: null, sampleCount: 0, ratings: null },
    inp: { p75Ms: null, sampleCount: 0, ratings: null },
    cls: { p75: null, sampleCount: 0, ratings: null },
    fcp: { p75Ms: null, sampleCount: 0, ratings: null },
    ttfb: { p75Ms: null, sampleCount: 0, ratings: null },
  },
  jsErrors: { count: 0, perPageLoad: null },
  httpRequests: { count: 0, failedCount: 0, failedRatio: null },
  lastSeen: null,
});

const result = (applications: ApplicationSummary[], environments: string[] = []) => ({
  applications,
  environments,
});

describe('getApplications', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('keeps one row per service and source, sorted by page loads', async () => {
    const { applications } = await getApplications({
      getOtelApplications: async () => result([app('shop', 'otel', 5), app('docs', 'otel', 50)]),
      getClassicApplications: async () => result([app('shop', 'classic', 20)]),
      logger,
    });

    expect(applications.map(({ serviceName, source }) => `${serviceName}:${source}`)).toEqual([
      'docs:otel',
      'shop:classic',
      'shop:otel',
    ]);
  });

  it('merges the environments of every source, without duplicates, sorted', async () => {
    const { environments } = await getApplications({
      getOtelApplications: async () => result([], ['staging', 'production']),
      getClassicApplications: async () => result([], ['production', 'dev']),
      logger,
    });

    expect(environments).toEqual(['dev', 'production', 'staging']);
  });

  it('lists "Not defined" before the environment names', async () => {
    const { environments } = await getApplications({
      getOtelApplications: async () => result([], ['production', 'ENVIRONMENT_NOT_DEFINED']),
      getClassicApplications: async () => result([], ['Alpha']),
      logger,
    });

    expect(environments).toEqual(['ENVIRONMENT_NOT_DEFINED', 'Alpha', 'production']);
  });

  it('does not query Classic without a Classic fetcher (serverless)', async () => {
    const getOtelApplications = jest.fn().mockResolvedValue(result([app('shop', 'otel', 1)]));

    const response = await getApplications({ getOtelApplications, logger });

    expect(response).toEqual(result([app('shop', 'otel', 1)]));
  });

  it('returns the other source when one fails', async () => {
    const response = await getApplications({
      getOtelApplications: async () => {
        throw new Error('security_exception');
      },
      getClassicApplications: async () => result([app('shop', 'classic', 1)], ['production']),
      logger,
    });

    expect(response).toEqual(result([app('shop', 'classic', 1)], ['production']));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('security_exception'));
  });

  it('answers 500 without the details when every source fails, and logs them', async () => {
    await expect(
      getApplications({
        getOtelApplications: async () => {
          throw new Error('otel down');
        },
        getClassicApplications: async () => {
          throw new Error('classic down');
        },
        logger,
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      message: 'Could not load the applications. Check the Kibana server logs for details.',
    });
    expect(logger.error).toHaveBeenCalledWith('Could not load the otel applications: otel down');
    expect(logger.error).toHaveBeenCalledWith(
      'Could not load the classic applications: classic down'
    );
    // Logged once, as errors, not also as warnings.
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('answers 403 without the user or roles when Elasticsearch denies every source', async () => {
    const denied = () =>
      new esErrors.ResponseError({
        statusCode: 403,
        body: { error: { type: 'security_exception', reason: 'unauthorized for user [someone]' } },
        headers: {},
        warnings: null,
        meta: {} as never,
      });
    // `APMEventClient` wraps its errors, so a Classic one comes in `originalError`.
    const wrapped = Object.assign(new Error('wrapped'), { originalError: denied() });

    const error = await getApplications({
      getOtelApplications: async () => {
        throw denied();
      },
      getClassicApplications: async () => {
        throw wrapped;
      },
      logger,
    }).catch((e) => e);

    expect(error).toMatchObject({
      isBoom: true,
      output: { statusCode: 403 },
      message: "You don't have read access to the application data.",
    });
    expect(error.message).not.toContain('someone');
  });

  it("answers 403 when Kibana denies a source's settings and Elasticsearch the other", async () => {
    const error = await getApplications({
      getOtelApplications: async () => {
        throw new esErrors.ResponseError({
          statusCode: 403,
          body: {},
          headers: {},
          warnings: null,
          meta: {} as never,
        });
      },
      // Reading the APM index settings without APM access.
      getClassicApplications: async () => {
        throw forbidden('Unable to get apm-indices');
      },
      logger,
    }).catch((e) => e);

    expect(error).toMatchObject({ isBoom: true, output: { statusCode: 403 } });
  });
});
