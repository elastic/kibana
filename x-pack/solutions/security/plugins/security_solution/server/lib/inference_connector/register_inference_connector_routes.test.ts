/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  INFERENCE_CONNECTOR_CLUSTER_PRIVILEGE,
  INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL,
} from '../../../common/inference_connector/constants';
import { serverMock, requestContextMock, requestMock } from '../detection_engine/routes/__mocks__';
import { registerInferenceConnectorRoutes } from './register_inference_connector_routes';

describe('GET /internal/inference_connector/privileges', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;
  let mockCheckPrivileges: jest.Mock;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);
    mockCheckPrivileges = jest.fn();

    registerInferenceConnectorRoutes({
      router: server.router,
      logger,
      getStartServices: jest.fn().mockResolvedValue([
        {},
        {
          security: {
            authz: {
              checkPrivilegesDynamicallyWithRequest: () => mockCheckPrivileges,
            },
          },
        },
      ]),
    });
  });

  it('returns has_all_required true when monitor_inference is authorized', async () => {
    mockCheckPrivileges.mockResolvedValue({
      hasAllRequested: true,
      privileges: {
        elasticsearch: {
          cluster: [{ privilege: INFERENCE_CONNECTOR_CLUSTER_PRIVILEGE, authorized: true }],
          index: {},
        },
        kibana: [],
      },
    });

    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL,
      }),
      context
    );

    expect(mockCheckPrivileges).toHaveBeenCalledWith({
      elasticsearch: { cluster: [INFERENCE_CONNECTOR_CLUSTER_PRIVILEGE], index: {} },
    });
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      has_all_required: true,
    });
  });

  it('returns has_all_required false when monitor_inference is unauthorized', async () => {
    mockCheckPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        elasticsearch: {
          cluster: [{ privilege: INFERENCE_CONNECTOR_CLUSTER_PRIVILEGE, authorized: false }],
          index: {},
        },
        kibana: [],
      },
    });

    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL,
      }),
      context
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      has_all_required: false,
    });
  });
});
