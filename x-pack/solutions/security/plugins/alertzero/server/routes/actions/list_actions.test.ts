/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { registerListActionsRoute } from './list_actions';

const makeDeps = (actionsService: unknown) => {
  const addVersion = jest.fn();
  const router = {
    versioned: {
      get: jest.fn().mockReturnValue({ addVersion }),
    },
  };
  registerListActionsRoute({
    router: router as unknown as RouteDependencies['router'],
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    getActionsService: () => actionsService,
  } as unknown as RouteDependencies);
  const handler = addVersion.mock.calls[0][1] as (
    context: unknown,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>,
    response: ReturnType<typeof httpServerMock.createResponseFactory>
  ) => Promise<unknown>;
  return { handler };
};

const requestWithCategories = (categories?: string[]) =>
  httpServerMock.createKibanaRequest({
    path: '/internal/alertzero/actions',
    query: categories ? { categories } : undefined,
  });

describe('registerListActionsRoute', () => {
  it('passes categories through to the service', async () => {
    const list = jest.fn().mockResolvedValue({ actions: [], total: 0 });
    const { handler } = makeDeps({ list });
    const response = httpServerMock.createResponseFactory();
    await handler(
      {},
      httpServerMock.createKibanaRequest({
        path: '/internal/alertzero/actions',
        // simulate the router-parsed multi-valued query param
        query: { categories: ['contain', 'escalate'] },
      }),
      response
    );
    expect(list).toHaveBeenCalledWith('default', ['contain', 'escalate']);
    expect(response.ok).toHaveBeenCalled();
  });

  it('returns the full catalog when no categories are given', async () => {
    const list = jest.fn().mockResolvedValue({ actions: [], total: 0 });
    const { handler } = makeDeps({ list });
    const response = httpServerMock.createResponseFactory();
    await handler({}, requestWithCategories(), response);
    expect(list).toHaveBeenCalledWith('default', undefined);
  });

  it('maps an invalid categories param to 400 with the param message', async () => {
    const { handler } = makeDeps({ list: jest.fn() });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      path: '/internal/alertzero/actions',
      query: { categories: Array(21).fill('c') },
    });
    await handler({}, request, response);
    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: expect.stringContaining('at most 20'),
      },
    });
  });

  it('maps service errors to 500', async () => {
    const list = jest.fn().mockRejectedValue(new Error('boom'));
    const { handler } = makeDeps({ list });
    const response = httpServerMock.createResponseFactory();
    await handler({}, requestWithCategories(), response);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to list actions' },
    });
  });
});
