/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import {
  ASSESS_RELEVANCE_API_PATH,
  CLASSIFY_SEVERITY_API_PATH,
  ENRICH_TAXONOMY_API_PATH,
  EXTRACT_DIAMOND_API_PATH,
} from '../../../common/threat_intel';
import { registerAssessRelevanceRoute } from './assess_relevance';
import { registerClassifySeverityRoute } from './classify_severity';
import { registerEnrichTaxonomyRoute } from './enrich_taxonomy';
import { registerExtractDiamondRoute } from './extract_diamond';
import { resolveScopedModel } from './lib/scoped_model';

jest.mock('./lib/scoped_model');

const routes = [
  [registerAssessRelevanceRoute, ASSESS_RELEVANCE_API_PATH, 'alertzero_fast'],
  [registerClassifySeverityRoute, CLASSIFY_SEVERITY_API_PATH, 'alertzero_fast'],
  [registerEnrichTaxonomyRoute, ENRICH_TAXONOMY_API_PATH, 'alertzero_fast'],
  [registerExtractDiamondRoute, EXTRACT_DIAMOND_API_PATH, 'alertzero_reasoning'],
] as const;

describe('threat intel model tiers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(resolveScopedModel).mockResolvedValue({
      ok: false,
      reason: 'no_connector',
      message: 'No tier connector available',
    });
  });

  it.each(routes)('%p resolves %s through %s', async (registerRoute, path, featureId) => {
    const router = httpServiceMock.createRouter();
    registerRoute({
      router,
      logger: loggingSystemMock.createLogger(),
      getInference: () => undefined,
      getSearchInferenceEndpoints: () => undefined,
      getSpacesService: () => undefined,
      getBootstrapReady: async () => {},
    });
    const version = Object.values(router.versioned.getRoute('post', path).versions)[0];
    const context = coreMock.createRequestHandlerContext();
    const request = httpServerMock.createKibanaRequest({
      path,
      spaceId: 'review-space',
      body: { text: 'Threat report' },
    });
    const response = httpServerMock.createResponseFactory();

    await version.handler({ core: Promise.resolve(context) } as never, request, response);

    expect(resolveScopedModel).toHaveBeenCalledWith(
      expect.objectContaining({ featureId, request, uiSettingsClient: context.uiSettings.client })
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: { message: 'No tier connector available' },
    });
  });
});
