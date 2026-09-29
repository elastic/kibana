/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedClass } from 'vitest';

import { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { InfraBackendLibs } from '../infra_types';
import { getApmDataAccessClient } from './get_apm_data_access_client';

vi.mock('@kbn/apm-data-access-plugin/server', () => {
  const mocked = {
    APMEventClient: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const MockApmEventClient = APMEventClient as MockedClass<typeof APMEventClient>;

const createContext = () =>
  ({
    core: Promise.resolve({
      savedObjects: { client: {} },
      elasticsearch: { client: { asCurrentUser: {} } },
      uiSettings: { client: { get: vi.fn().mockResolvedValue(false) } },
    }),
  } as unknown as InfraPluginRequestHandlerContext);

const createLibs = () =>
  ({
    plugins: {
      apmDataAccess: {
        setup: {
          getApmIndices: vi.fn().mockResolvedValue({}),
          getServices: vi.fn().mockReturnValue({ getDocumentSources: vi.fn() }),
        },
      },
    },
  } as unknown as InfraBackendLibs);

describe('getApmDataAccessClient', () => {
  beforeEach(() => {
    MockApmEventClient.mockClear();
  });

  it.each([
    ['CPS is disabled', undefined],
    ['only the current project is selected', PROJECT_ROUTING.ORIGIN],
    ['all projects are selected', PROJECT_ROUTING.ALL],
  ])('passes the expected project routing when %s', async (_scenario, projectRouting) => {
    const request = {
      headers: projectRouting ? { 'x-project-routing': projectRouting } : {},
    } as KibanaRequest;

    await getApmDataAccessClient({
      libs: createLibs(),
      context: createContext(),
      request,
    }).getServices();

    expect(MockApmEventClient).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        options: expect.objectContaining({
          includeFrozen: false,
          projectRouting,
        }),
      })
    );
  });
});
