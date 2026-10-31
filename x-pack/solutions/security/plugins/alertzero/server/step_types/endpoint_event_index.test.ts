/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { ENDPOINT_EVENTS_INDEX } from '../../common/endpoint_event_indices';
import {
  getEndpointEventIndexStepDefinition,
  resolveEndpointEventIndex,
} from './endpoint_event_index';

const coreStartWith = (settingValue: unknown, get = jest.fn().mockResolvedValue(settingValue)) => {
  const coreStart = coreMock.createStart();
  coreStart.uiSettings.asScopedToClient.mockReturnValue({
    get,
  } as unknown as ReturnType<CoreStart['uiSettings']['asScopedToClient']>);
  return { coreStart, get };
};

describe('resolveEndpointEventIndex', () => {
  let request: KibanaRequest;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
  });

  it('turns the space data view into local and remote endpoint patterns', async () => {
    const { coreStart } = coreStartWith(['remote_a:logs-aws.cloudtrail*', 'remote_*:logs-*']);

    await expect(resolveEndpointEventIndex(() => coreStart, request)).resolves.toBe(
      `${ENDPOINT_EVENTS_INDEX},remote_a:${ENDPOINT_EVENTS_INDEX},remote_*:${ENDPOINT_EVENTS_INDEX}`
    );
  });

  it('reads the Security default data view through the request', async () => {
    const { coreStart, get } = coreStartWith(['logs-*']);

    await resolveEndpointEventIndex(() => coreStart, request);

    expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
    expect(get).toHaveBeenCalledWith(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
  });

  it('returns the local pattern when the setting is missing or not a list', async () => {
    const { coreStart } = coreStartWith(undefined);

    await expect(resolveEndpointEventIndex(() => coreStart, request)).resolves.toBe(
      ENDPOINT_EVENTS_INDEX
    );
  });

  it('returns the local pattern when the read throws', async () => {
    const coreStart = coreMock.createStart();
    coreStart.uiSettings.asScopedToClient.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('saved object unavailable')),
    } as unknown as ReturnType<CoreStart['uiSettings']['asScopedToClient']>);

    await expect(resolveEndpointEventIndex(() => coreStart, request)).resolves.toBe(
      ENDPOINT_EVENTS_INDEX
    );
  });
});

describe('endpoint event index step', () => {
  const contextFor = (request: KibanaRequest | undefined) =>
    ({
      input: {},
      contextManager: { getFakeRequest: () => request },
      logger: { warn: jest.fn() },
    } as unknown as StepHandlerContext<unknown, unknown>);

  it('returns the local pattern when the workflow has no request', async () => {
    const step = getEndpointEventIndexStepDefinition({
      getCoreStart: () => {
        throw new Error('should not read core');
      },
    });

    const { output } = await step.handler(contextFor(undefined));

    expect(output).toEqual({ index: ENDPOINT_EVENTS_INDEX });
  });

  it('returns the local pattern when core has not started', async () => {
    const step = getEndpointEventIndexStepDefinition({
      getCoreStart: () => {
        throw new Error('CoreStart is not available until the AlertZero plugin has started');
      },
    });

    const { output } = await step.handler(contextFor(httpServerMock.createKibanaRequest()));

    expect(output).toEqual({ index: ENDPOINT_EVENTS_INDEX });
  });
});
