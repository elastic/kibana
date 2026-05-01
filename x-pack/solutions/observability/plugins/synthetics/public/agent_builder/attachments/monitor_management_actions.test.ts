/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import { SYNTHETICS_API_URLS } from '../../../common/constants/synthetics/rest_api';
import { INITIAL_REST_VERSION } from '../../../common/constants/ui';
import {
  MonitorSaveError,
  createMonitor,
  getMonitorDetailsUrl,
  updateMonitor,
} from './monitor_management_actions';

const buildMonitor = (overrides: Partial<MonitorAttachmentData> = {}): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Test',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [{ id: 'us_central', isServiceManaged: true }],
  [ConfigKey.URLS]: 'https://example.com',
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  ...overrides,
});

const buildHttp = (response: unknown): HttpStart => {
  const post = jest.fn(async () => response);
  const put = jest.fn(async () => response);
  return { post, put } as unknown as HttpStart;
};

const buildHttpThatThrows = (error: unknown): HttpStart => {
  const post = jest.fn(async () => {
    throw error;
  });
  const put = jest.fn(async () => {
    throw error;
  });
  return { post, put } as unknown as HttpStart;
};

/**
 * Mirrors the shape of `IHttpFetchError` from `@kbn/core-http-browser`:
 * `.message` is the HTTP status text, `.body` is the parsed server
 * response. Synthetics's failed POSTs currently surface the validation
 * detail under `body.message`; some error paths nest it deeper under
 * `body.attributes.message`.
 */
const buildFetchError = (overrides: { message: string; body?: unknown }): Error =>
  Object.assign(new Error(overrides.message), { body: overrides.body });

describe('createMonitor', () => {
  it('POSTs the monitor body to /api/synthetics/monitors with the v1 API version', async () => {
    const http = buildHttp({ id: 'config-uuid' });
    const monitor = buildMonitor();

    const outcome = await createMonitor(http, monitor);

    expect(outcome).toEqual({ id: 'config-uuid', locationWarnings: [] });
    expect(http.post).toHaveBeenCalledWith(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS, {
      body: JSON.stringify(monitor),
      version: INITIAL_REST_VERSION,
      query: { internal: true },
    });
  });

  it('treats partial-failure responses (id present + errors) as a save with location warnings', async () => {
    const http = buildHttp({
      attributes: {
        message: 'Some locations failed',
        id: 'config-uuid',
        errors: [
          { locationId: 'us_central', error: { message: 'Fleet agent offline' } },
          { locationId: 'eu_west', error: undefined },
        ],
      },
    });

    const outcome = await createMonitor(http, buildMonitor());

    expect(outcome.id).toBe('config-uuid');
    expect(outcome.locationWarnings).toEqual([
      { locationId: 'us_central', message: 'Fleet agent offline' },
      { locationId: 'eu_west', message: 'Unknown location error' },
    ]);
  });

  it('throws MonitorSaveError when the response is an error without an id', async () => {
    const http = buildHttp({
      attributes: {
        message: 'Validation failed: name is required',
        errors: [],
      },
    });

    await expect(createMonitor(http, buildMonitor())).rejects.toBeInstanceOf(MonitorSaveError);
    await expect(createMonitor(http, buildMonitor())).rejects.toMatchObject({
      message: 'Validation failed: name is required',
    });
  });

  describe('error extraction (T7 hot-fix #3)', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('surfaces body.message from an IHttpFetchError instead of the generic status text', async () => {
      const http = buildHttpThatThrows(
        buildFetchError({
          message: 'Bad Request',
          body: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'request body.urls: Invalid URL format',
          },
        })
      );

      await expect(createMonitor(http, buildMonitor())).rejects.toMatchObject({
        message: 'request body.urls: Invalid URL format',
      });
    });

    it('prefers body.attributes.message when present (synthetics partial-failure shape on throw)', async () => {
      const http = buildHttpThatThrows(
        buildFetchError({
          message: 'Bad Request',
          body: {
            attributes: {
              message: 'Monitor is not valid: locations must contain at least 1 entry',
              errors: [],
            },
          },
        })
      );

      await expect(createMonitor(http, buildMonitor())).rejects.toMatchObject({
        message: 'Monitor is not valid: locations must contain at least 1 entry',
      });
    });

    it('falls back to error.message when body has no usable message', async () => {
      const http = buildHttpThatThrows(buildFetchError({ message: 'Forbidden', body: {} }));
      await expect(createMonitor(http, buildMonitor())).rejects.toMatchObject({
        message: 'Forbidden',
      });
    });

    it('falls back to error.message when there is no body at all', async () => {
      const http = buildHttpThatThrows(new Error('Network error'));
      await expect(createMonitor(http, buildMonitor())).rejects.toMatchObject({
        message: 'Network error',
      });
    });

    it('logs the full error + body to console.error so the dev can grab the raw payload', async () => {
      const errorBody = { message: 'request body.schedule: Invalid schedule' };
      const error = buildFetchError({ message: 'Bad Request', body: errorBody });
      const http = buildHttpThatThrows(error);
      await expect(createMonitor(http, buildMonitor())).rejects.toBeInstanceOf(MonitorSaveError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[synthetics × agent_builder] create failed:',
        error,
        'body:',
        errorBody
      );
    });
  });
});

describe('updateMonitor', () => {
  it('PUTs to /api/synthetics/monitors/{configId} with the v1 API version', async () => {
    const http = buildHttp({ id: 'config-uuid' });
    const monitor = buildMonitor({ [ConfigKey.CONFIG_ID]: 'config-uuid' });

    const outcome = await updateMonitor(http, 'config-uuid', monitor);

    expect(outcome).toEqual({ id: 'config-uuid', locationWarnings: [] });
    expect(http.put).toHaveBeenCalledWith(
      `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/config-uuid`,
      {
        body: JSON.stringify(monitor),
        version: INITIAL_REST_VERSION,
        query: { internal: true },
      }
    );
  });

  it('URL-encodes config ids that contain unsafe path characters', async () => {
    const http = buildHttp({ id: 'a/b%c' });
    await updateMonitor(http, 'a/b%c', buildMonitor());
    const url = (http.put as jest.Mock).mock.calls[0][0];
    expect(url).toBe(`${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/a%2Fb%25c`);
  });
});

describe('getMonitorDetailsUrl', () => {
  it('joins the appPath with the monitor route, encoding the configId', () => {
    expect(getMonitorDetailsUrl('config-1', '/app/synthetics')).toBe(
      '/app/synthetics/monitor/config-1'
    );
    expect(getMonitorDetailsUrl('a/b', '/spc/dev/app/synthetics')).toBe(
      '/spc/dev/app/synthetics/monitor/a%2Fb'
    );
  });
});
