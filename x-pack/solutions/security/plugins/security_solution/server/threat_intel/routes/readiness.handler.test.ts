/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServiceMock,
  httpServerMock,
  coreMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import {
  READINESS_API_PATH,
  THREAT_INTEL_INDICATORS_INDEX,
  type ReadinessResponse,
} from '../../../common/threat_intel';
import { getThreatIntelReadiness } from '../services/readiness';
import { registerReadinessRoute } from './readiness';

jest.mock('../services/readiness', () => ({ getThreatIntelReadiness: jest.fn() }));

const getThreatIntelReadinessMock = getThreatIntelReadiness as jest.MockedFunction<
  typeof getThreatIntelReadiness
>;

const baseResult: ReadinessResponse = {
  status: 'ready',
  reasonCodes: [],
  usableReportCount: 1,
  indicatorEligibleReportCount: 1,
};

const callRoute = async (spaceId: string) => {
  const logger = loggingSystemMock.createLogger();
  const router = httpServiceMock.createRouter();
  const getSpacesService = jest.fn().mockReturnValue({ getSpaceId: () => spaceId });
  registerReadinessRoute({
    router,
    logger,
    getSpacesService,
    getBootstrapReady: jest.fn(),
    getInference: jest.fn(),
    getSearchInferenceEndpoints: jest.fn(),
  } as never);

  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getAlias.mockResolvedValue({});
  esClient.indices.putAlias.mockResolvedValue({ acknowledged: true });
  const context = coreMock.createRequestHandlerContext();
  context.elasticsearch.client.asInternalUser = esClient;

  const [version] = Object.values(router.versioned.getRoute('get', READINESS_API_PATH).versions);
  const response = httpServerMock.createResponseFactory();
  await version.handler(
    { core: Promise.resolve(context) } as never,
    httpServerMock.createKibanaRequest(),
    response
  );
  return { response, esClient };
};

describe('readiness route indicatorAlias', () => {
  beforeEach(() => {
    getThreatIntelReadinessMock.mockReset();
  });

  it('returns the space alias and creates it on a fresh space', async () => {
    getThreatIntelReadinessMock.mockResolvedValue(baseResult);

    const { response, esClient } = await callRoute('fresh-space');

    expect(response.ok).toHaveBeenCalledWith({
      body: { ...baseResult, indicatorAlias: `${THREAT_INTEL_INDICATORS_INDEX}-fresh-space` },
    });
    expect(esClient.indices.putAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        index: THREAT_INTEL_INDICATORS_INDEX,
        name: `${THREAT_INTEL_INDICATORS_INDEX}-fresh-space`,
      })
    );
  });

  it('returns the alias for a degraded pipeline, which can still serve indicators', async () => {
    getThreatIntelReadinessMock.mockResolvedValue({ ...baseResult, status: 'degraded' });

    const { response } = await callRoute('degraded-space');

    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        indicatorAlias: `${THREAT_INTEL_INDICATORS_INDEX}-degraded-space`,
      }),
    });
  });

  it('omits the alias and does not touch the cluster when blocked', async () => {
    const blocked: ReadinessResponse = { ...baseResult, status: 'blocked' };
    getThreatIntelReadinessMock.mockResolvedValue(blocked);

    const { response, esClient } = await callRoute('blocked-space');

    expect(response.ok).toHaveBeenCalledWith({ body: blocked });
    expect(esClient.indices.putAlias).not.toHaveBeenCalled();
  });
});
