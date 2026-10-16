/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  type getEndpointInventoryCountsInputSchema,
  getEndpointInventoryCountsOutputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import { getEndpointInventoryCountsStepDefinition } from '.';

type InventoryContext = StepHandlerContext<typeof getEndpointInventoryCountsInputSchema>;

const createContext = (callKibanaApi: jest.Mock, esCount: jest.Mock): InventoryContext =>
  ({
    input: {},
    contextManager: {
      callKibanaApi,
      getScopedEsClient: jest.fn().mockReturnValue({ count: esCount }),
      getFakeRequest: jest.fn(),
      getContext: jest.fn(),
      renderInputTemplate: jest.fn(),
    },
  } as unknown as InventoryContext);

const readQuery = (path: string): URLSearchParams => new URL(`http://kibana${path}`).searchParams;

const run = async (callKibanaApi: jest.Mock, esCount: jest.Mock) => {
  const result = await getEndpointInventoryCountsStepDefinition.handler(
    createContext(callKibanaApi, esCount)
  );
  expect(getEndpointInventoryCountsOutputSchema.safeParse(result.output).success).toBe(true);
  return result.output!;
};

describe('getEndpointInventoryCountsStepDefinition', () => {
  const packagePoliciesRoute = (
    items: Array<{ agents?: number }>,
    total: number = items.length
  ) => ({ status: 200, headers: {}, body: { items, total } });

  it('returns the three counts when every read succeeds', async () => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 4 }])
          : { status: 200, headers: {}, body: { total: 6 } }
      );
    const esCount = jest.fn().mockResolvedValue({ count: 9 });

    const output = await run(callKibanaApi, esCount);

    expect(output.fleet_agent_count).toBe(4);
    expect(output.united_metadata_count).toBe(6);
    expect(output.current_metadata_count).toBe(9);
    expect(esCount).toHaveBeenCalledWith({
      index: 'metrics-endpoint.metadata_current_*',
      allow_no_indices: false,
    });
    expect(output.unauthorized).toEqual([]);
    expect(output.unavailable).toEqual([]);
  });

  it.each(['failed shards', 'missing index'])(
    'omits the current count and preserves other counts for %s',
    async (failure) => {
      const callKibanaApi = jest
        .fn()
        .mockImplementation(async ({ path }: { path: string }) =>
          path.startsWith('/api/fleet/package_policies')
            ? packagePoliciesRoute([{ agents: 4 }])
            : { status: 200, headers: {}, body: { total: 6 } }
        );
      const esCount = jest.fn();
      if (failure === 'failed shards') {
        esCount.mockResolvedValue({ count: 9, _shards: { failed: 1 } });
      } else {
        esCount.mockRejectedValue({
          meta: { statusCode: 404 },
          body: { error: { type: 'index_not_found_exception' } },
        });
      }

      const output = await run(callKibanaApi, esCount);

      expect(output.current_metadata_count).toBeUndefined();
      expect(output.unavailable).toEqual(['current_metadata_count']);
      expect(output.unauthorized).toEqual([]);
      expect(output.fleet_agent_count).toBe(4);
      expect(output.united_metadata_count).toBe(6);
    }
  );

  it('sums the fleet agent count across more than one package policy page', async () => {
    const firstPage = Array.from({ length: 100 }, () => ({ agents: 1 }));
    const lastPage = [{ agents: 1 }, { agents: 1 }];
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) => {
      if (path.startsWith('/api/fleet/package_policies')) {
        return readQuery(path).get('page') === '2'
          ? packagePoliciesRoute(lastPage, 102)
          : packagePoliciesRoute(firstPage, 102);
      }
      return { status: 200, headers: {}, body: { total: 6 } };
    });
    const esCount = jest.fn().mockResolvedValue({ count: 9 });

    const output = await run(callKibanaApi, esCount);

    expect(output.fleet_agent_count).toBe(102);
    const packagePolicyCalls = callKibanaApi.mock.calls
      .map(([params]) => params as { path: string })
      .filter((params) => params.path.startsWith('/api/fleet/package_policies'));
    expect(packagePolicyCalls).toHaveLength(2);
    for (const { path } of packagePolicyCalls) {
      expect(readQuery(path).get('kuery')).toBe('fleet-package-policies.package.name:endpoint');
      expect(readQuery(path).get('withAgentCount')).toBe('true');
    }
  });

  it('omits the fleet count when the package policy walk reaches its cap', async () => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ path }: { path: string }) =>
      path.startsWith('/api/fleet/package_policies')
        ? packagePoliciesRoute(
            Array.from({ length: 100 }, () => ({ agents: 1 })),
            10001
          )
        : { status: 200, headers: {}, body: { total: 6 } }
    );

    const output = await run(callKibanaApi, jest.fn().mockResolvedValue({ count: 9 }));

    expect(output.fleet_agent_count).toBeUndefined();
    expect(output.unavailable).toEqual(['fleet_agent_count']);
    expect(output.unauthorized).toEqual([]);
    expect(output.united_metadata_count).toBe(6);
    expect(output.current_metadata_count).toBe(9);
    const pages = callKibanaApi.mock.calls
      .map(([{ path }]) => path as string)
      .filter((path) => path.startsWith('/api/fleet/package_policies'));
    expect(pages).toHaveLength(100);
    expect(readQuery(pages[99]).get('page')).toBe('100');
    expect(readQuery(pages[99]).get('perPage')).toBe('100');
  });

  it('omits current_metadata_count and marks it unauthorized on an ES security exception', async () => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.startsWith('/api/fleet/package_policies')
          ? packagePoliciesRoute([{ agents: 4 }])
          : { status: 200, headers: {}, body: { total: 4 } }
      );
    const esCount = jest.fn().mockRejectedValue({
      meta: { statusCode: 403 },
      body: { error: { type: 'security_exception' } },
    });

    const output = await run(callKibanaApi, esCount);

    expect(output.current_metadata_count).toBeUndefined();
    expect(output.unauthorized).toEqual(['current_metadata_count']);
    expect(output.fleet_agent_count).toBe(4);
    expect(output.united_metadata_count).toBe(4);
  });
});
