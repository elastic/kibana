/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  getRemoteIndexTargetsStepDefinition,
  resolveRemoteIndexTargets,
} from './remote_index_targets';

const ENDPOINT_EVENTS = 'logs-endpoint.events.*';
const PROCESS = 'logs-endpoint.events.process-*';
const NETWORK = 'logs-endpoint.events.network-*';

const settingsWith = (settingValue: unknown, get = jest.fn().mockResolvedValue(settingValue)) => {
  const getUiSettingsClient = jest.fn().mockReturnValue({ get } as unknown as IUiSettingsClient);
  return { getUiSettingsClient, get };
};

describe('resolveRemoteIndexTargets', () => {
  let request: KibanaRequest;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
  });

  it('turns the space data view into local and remote patterns', async () => {
    const { getUiSettingsClient } = settingsWith([
      'remote_a:logs-aws.cloudtrail*',
      'remote_*:logs-*',
    ]);

    await expect(
      resolveRemoteIndexTargets(getUiSettingsClient, request, [ENDPOINT_EVENTS])
    ).resolves.toEqual({
      index: `${ENDPOINT_EVENTS},remote_a:${ENDPOINT_EVENTS},remote_*:${ENDPOINT_EVENTS}`,
      clusters: ['remote_a', 'remote_*'],
      incomplete: false,
    });
  });

  it('adds every requested pattern for each cluster', async () => {
    const { getUiSettingsClient } = settingsWith(['remote_a:logs-*']);

    await expect(
      resolveRemoteIndexTargets(getUiSettingsClient, request, [PROCESS, NETWORK])
    ).resolves.toEqual({
      index: `${PROCESS},${NETWORK},remote_a:${PROCESS},remote_a:${NETWORK}`,
      clusters: ['remote_a'],
      incomplete: false,
    });
  });

  it('reads the Security default data view through the request', async () => {
    const { getUiSettingsClient, get } = settingsWith(['logs-*']);

    await resolveRemoteIndexTargets(getUiSettingsClient, request, [ENDPOINT_EVENTS]);

    expect(getUiSettingsClient).toHaveBeenCalledWith(request);
    expect(get).toHaveBeenCalledWith(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
  });

  it('returns the local patterns when the setting is missing or not a list', async () => {
    const { getUiSettingsClient } = settingsWith(undefined);

    await expect(
      resolveRemoteIndexTargets(getUiSettingsClient, request, [PROCESS, NETWORK])
    ).resolves.toEqual({ index: `${PROCESS},${NETWORK}`, clusters: [], incomplete: true });
  });

  it('returns the local patterns when the read throws', async () => {
    const { getUiSettingsClient } = settingsWith(
      undefined,
      jest.fn().mockRejectedValue(new Error('saved object unavailable'))
    );

    await expect(
      resolveRemoteIndexTargets(getUiSettingsClient, request, [ENDPOINT_EVENTS])
    ).resolves.toEqual({ index: ENDPOINT_EVENTS, clusters: [], incomplete: true });
  });
});

describe('remote index targets step', () => {
  const contextFor = (request: KibanaRequest | undefined, patterns = [ENDPOINT_EVENTS]) =>
    ({
      input: { patterns },
      contextManager: { getFakeRequest: () => request },
      logger: { warn: jest.fn() },
    } as unknown as StepHandlerContext<unknown, unknown>);

  it('returns the local patterns when the workflow has no request', async () => {
    const step = getRemoteIndexTargetsStepDefinition({
      getUiSettingsClient: () => {
        throw new Error('should not read settings');
      },
    });

    const { output } = await step.handler(contextFor(undefined, [PROCESS, NETWORK]));

    expect(output).toEqual({ index: `${PROCESS},${NETWORK}`, clusters: [], incomplete: true });
  });

  it('returns the local patterns when core has not started', async () => {
    const step = getRemoteIndexTargetsStepDefinition({
      getUiSettingsClient: () => {
        throw new Error('CoreStart is not available until the AlertZero plugin has started');
      },
    });

    const { output } = await step.handler(contextFor(httpServerMock.createKibanaRequest()));

    expect(output).toEqual({ index: ENDPOINT_EVENTS, clusters: [], incomplete: true });
  });

  it('resolves the requested patterns for the running identity', async () => {
    const { getUiSettingsClient } = settingsWith(['remote_a:logs-*']);
    const step = getRemoteIndexTargetsStepDefinition({ getUiSettingsClient });

    const { output } = await step.handler(contextFor(httpServerMock.createKibanaRequest()));

    expect(output).toEqual({
      index: `${ENDPOINT_EVENTS},remote_a:${ENDPOINT_EVENTS}`,
      clusters: ['remote_a'],
      incomplete: false,
    });
  });

  it('reports an incomplete resolution for a data view it cannot read in full', async () => {
    const { getUiSettingsClient } = settingsWith([
      '*:logs-*',
      ...Array.from({ length: 205 }, (_, i) => `filler-${i}-*`),
      '-remote_private:*',
    ]);
    const step = getRemoteIndexTargetsStepDefinition({ getUiSettingsClient });

    const { output } = await step.handler(contextFor(httpServerMock.createKibanaRequest()));

    expect(output).toEqual({ index: ENDPOINT_EVENTS, clusters: [], incomplete: true });
  });

  it('bounds the patterns it accepts', () => {
    const { inputSchema: schema } = getRemoteIndexTargetsStepDefinition({
      getUiSettingsClient: jest.fn(),
    });

    expect(schema.safeParse({ patterns: [] }).success).toBe(false);
    expect(schema.safeParse({ patterns: [''] }).success).toBe(false);
    expect(schema.safeParse({ patterns: ['x'.repeat(257)] }).success).toBe(false);
    expect(schema.safeParse({ patterns: Array(21).fill('logs-*') }).success).toBe(false);
    expect(schema.safeParse({ patterns: [ENDPOINT_EVENTS] }).success).toBe(true);
  });
});
