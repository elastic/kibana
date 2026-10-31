/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import {
  type getEndpointPackageStatusInputSchema,
  getEndpointPackageStatusOutputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/package';
import { getEndpointPackageStatusStepDefinition } from '.';

type Context = StepHandlerContext<typeof getEndpointPackageStatusInputSchema>;

const PACKAGE_ROUTE = '/api/fleet/epm/packages/endpoint';
const TRANSFORMS_ROUTE = '/internal/api/endpoint/metadata/transforms';

const securityException = {
  meta: { statusCode: 403 },
  body: { error: { type: 'security_exception' } },
};

const createContext = (input: Context['input']): Context => {
  const esClient = {
    transform: { getTransform: jest.fn().mockRejectedValue(securityException) },
    indices: { getSettings: jest.fn().mockRejectedValue(securityException) },
    ingest: { getPipeline: jest.fn().mockRejectedValue(securityException) },
    cat: { nodes: jest.fn().mockRejectedValue(securityException) },
  };
  return {
    input,
    contextManager: {
      callKibanaApi: jest.fn(async ({ path }: { path: string }) => {
        if (path === PACKAGE_ROUTE) {
          return {
            status: 200,
            headers: {},
            body: {
              item: {
                name: 'endpoint',
                version: '9.4.0',
                latestVersion: '9.5.0',
                installationInfo: { version: '9.4.0', install_status: 'installed' },
                assets: {
                  elasticsearch: {
                    transform: [
                      {
                        pkgkey: 'endpoint-9.4.0',
                        path: 'endpoint-9.4.0/elasticsearch/transform/metadata_current/default.json',
                      },
                    ],
                  },
                },
              },
            },
          };
        }
        throw new KibanaApiCallError({ status: 403, headers: {}, body: {}, message: 'HTTP 403' });
      }),
      getScopedEsClient: jest.fn(() => esClient),
      getFakeRequest: jest.fn(),
      getContext: jest.fn(),
      renderInputTemplate: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'security.getEndpointPackageStatus',
  } as unknown as Context;
};

describe('getEndpointPackageStatusStepDefinition', () => {
  it('returns freshness and degrades the denied reads into unauthorized parts', async () => {
    const context = createContext({ include_configurations: true });

    const result = await getEndpointPackageStatusStepDefinition.handler(context);
    const output = getEndpointPackageStatusOutputSchema.parse(result.output);

    expect(output.package).toEqual({
      name: 'endpoint',
      version: '9.4.0',
      latestVersion: '9.5.0',
      installationInfo: { version: '9.4.0', install_status: 'installed' },
    });
    expect(output.stale).toBe(true);
    expect(output.configurations).toBeUndefined();
    expect(output.unauthorized).toEqual(
      expect.arrayContaining(['package_configurations', 'package_default_settings'])
    );
    expect(output.unavailable).toEqual([]);

    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: TRANSFORMS_ROUTE,
      headers: { 'elastic-api-version': '1' },
    });
    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: `${PACKAGE_ROUTE}/9.4.0/elasticsearch/transform/metadata_current/default.json`,
    });
  });
});
