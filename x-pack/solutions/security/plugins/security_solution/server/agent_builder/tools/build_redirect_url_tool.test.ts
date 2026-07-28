/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ENABLE_NEW_FLYOUT_SETTING } from '../../../common/constants';
import type { ExperimentalFeatures } from '../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import {
  buildRedirectUrlTool,
  buildRedirectUrlSchema,
  SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
} from './build_redirect_url_tool';

const SERVER_BASE_PATH = '/kbn';
const SPACE_ID = 'space-a';
const PREFIX = `${SERVER_BASE_PATH}/s/${SPACE_ID}`;

const mockUiSettingsGet = jest.fn();

const coreSetup = {
  getStartServices: jest.fn().mockResolvedValue([
    {
      http: { basePath: { serverBasePath: SERVER_BASE_PATH } },
      uiSettings: { asScopedToClient: () => ({ get: mockUiSettingsGet }) },
    },
    {},
  ]),
} as unknown as SecuritySolutionPluginCoreSetupDependencies;

const experimentalFeatures = {
  newFlyoutSystemDisabled: false,
} as ExperimentalFeatures;

const context = {
  logger: loggerMock.create(),
  spaceId: SPACE_ID,
  savedObjectsClient: {},
} as never;

/** Decodes a named flyout query param back into its state (percent-decode + rison decode). */
const decodeQueryParam = (url: string, key: string) => {
  const param = new URLSearchParams(url.split('?')[1]).get(key);
  if (param == null) throw new Error(`no ${key} param in url`);
  return decode(param);
};

const decodeFlyout = (url: string) =>
  decodeQueryParam(url, 'flyout') as { left?: unknown; right?: unknown; preview?: unknown };

const decodeFlyoutV2 = (url: string) => decodeQueryParam(url, 'flyoutV2') as unknown[];

describe('buildRedirectUrlTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUiSettingsGet.mockResolvedValue(true);
  });

  it('registers as security.build_redirect_url', () => {
    expect(SECURITY_BUILD_REDIRECT_URL_TOOL_ID).toBe('security.build_redirect_url');
    expect(buildRedirectUrlTool(coreSetup, experimentalFeatures).id).toBe(
      SECURITY_BUILD_REDIRECT_URL_TOOL_ID
    );
  });

  describe('base path + space prefixing', () => {
    it('prefixes an app-relative path with the base path and active space', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        { path: '/app/security/entity_analytics_management/risk_score' },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(
        `${PREFIX}/app/security/entity_analytics_management/risk_score`
      );
    });

    it('preserves a query string already present on the path', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        { path: '/app/security/alerts?query=foo' },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(
        `${PREFIX}/app/security/alerts?query=foo`
      );
    });
  });

  describe('path validation', () => {
    it.each(['app/security', 'http://evil.com', 'https://evil.com', '//evil.com'])(
      'returns an error result for a non app-relative path: %s',
      async (path) => {
        const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
          { path },
          context
        )) as ToolHandlerStandardReturn;
        expect(results[0].type).toBe(ToolResultType.error);
        expect((results[0].data as { message: string }).message).toContain('app-relative');
      }
    );
  });

  describe('flyout serialization', () => {
    it('appends a rison-encoded flyout query param for unmigrated panels (watchlists)', async () => {
      const flyout = {
        right: { id: 'watchlists-flyout', params: { mode: 'edit', watchlistId: 'wl-123' } },
      };
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        { path: '/app/security/entity_analytics_management/watchlists', flyout },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(
        url.startsWith(`${PREFIX}/app/security/entity_analytics_management/watchlists?flyout=`)
      ).toBe(true);
      expect(decodeFlyout(url)).toEqual(flyout);
    });

    it('joins the flyout param with "&" when the path already has a query string', async () => {
      mockUiSettingsGet.mockResolvedValue(false);
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        {
          path: '/app/security/entity_analytics_home_page?foo=bar',
          flyout: {
            right: { id: 'host-panel', params: { hostName: 'abc', entityId: 'host:abc' } },
          },
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url).toContain('?foo=bar&flyout=');
      expect((decodeFlyout(url).right as { id: string }).id).toBe('host-panel');
    });

    it('does not append a flyout param when flyout has no panels', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        { path: '/app/security', flyout: {} },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(`${PREFIX}/app/security`);
    });
  });

  describe('expandable flyout + UI setting translation', () => {
    const expandable = {
      right: {
        id: 'user-panel',
        params: {
          userName: 'florence',
          entityId: 'user:florence',
          scopeId: 'entity-analytics-home-table',
        },
      },
      left: {
        id: 'user_details',
        params: {
          path: { tab: 'resolution_group' },
          entityId: 'user:florence',
          scopeId: 'entity-analytics-home-table',
        },
      },
    };
    const expectedV2 = [
      {
        kind: 'entityResolution',
        entityId: 'user:florence',
        entityType: 'user',
        entityName: 'florence',
        scopeId: 'entity-analytics-home-table',
      },
      {
        kind: 'user',
        userName: 'florence',
        entityId: 'user:florence',
        scopeId: 'entity-analytics-home-table',
      },
    ];

    it('translates expandable panels to flyoutV2 when the new-flyout setting is enabled', async () => {
      mockUiSettingsGet.mockResolvedValue(true);
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        {
          path: '/app/security/entity_analytics_home_page',
          flyout: expandable,
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(mockUiSettingsGet).toHaveBeenCalledWith(ENABLE_NEW_FLYOUT_SETTING);
      expect(url).toContain('flyoutV2=');
      expect(url).not.toContain('?flyout=');
      expect(decodeFlyoutV2(url)).toEqual(expectedV2);
    });

    it('encodes legacy flyout when the new-flyout setting is disabled', async () => {
      mockUiSettingsGet.mockResolvedValue(false);
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        {
          path: '/app/security/entity_analytics_home_page',
          flyout: expandable,
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url).toContain('?flyout=');
      expect(url).not.toContain('flyoutV2=');
      expect(decodeFlyout(url)).toEqual(expandable);
    });

    it('encodes legacy flyout when newFlyoutSystemDisabled experimental flag is on', async () => {
      mockUiSettingsGet.mockResolvedValue(true);
      const { results } = (await buildRedirectUrlTool(coreSetup, {
        ...experimentalFeatures,
        newFlyoutSystemDisabled: true,
      }).handler(
        {
          path: '/app/security/entity_analytics_home_page',
          flyout: expandable,
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(mockUiSettingsGet).not.toHaveBeenCalled();
      expect(url).toContain('?flyout=');
      expect(url).not.toContain('flyoutV2=');
      expect(decodeFlyout(url)).toEqual(expandable);
    });

    it('keeps legacy flyout encoding for unmigrated panels (watchlists) when new flyout is on', async () => {
      mockUiSettingsGet.mockResolvedValue(true);
      const flyout = {
        right: { id: 'watchlists-flyout', params: { mode: 'edit', watchlistId: 'wl-123' } },
      };
      const { results } = (await buildRedirectUrlTool(coreSetup, experimentalFeatures).handler(
        { path: '/app/security/entity_analytics_management/watchlists', flyout },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url).toContain('?flyout=');
      expect(url).not.toContain('flyoutV2=');
      expect(decodeFlyout(url)).toEqual(flyout);
    });
  });
});

describe('buildRedirectUrlSchema', () => {
  it('requires a path', () => {
    expect(buildRedirectUrlSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a bare path', () => {
    expect(buildRedirectUrlSchema.safeParse({ path: '/app/security' }).success).toBe(true);
  });

  it('accepts expandable panels as flyout', () => {
    expect(
      buildRedirectUrlSchema.safeParse({
        path: '/app/security',
        flyout: { right: { id: 'watchlists-flyout', params: { watchlistId: 'wl-1' } } },
      }).success
    ).toBe(true);
  });

  it('rejects a v2 descriptor array as flyout', () => {
    expect(
      buildRedirectUrlSchema.safeParse({
        path: '/app/security',
        flyout: [
          { kind: 'entityResolution', entityId: 'host:a', entityType: 'host', entityName: 'a' },
          { kind: 'host', hostName: 'a', entityId: 'host:a' },
        ],
      }).success
    ).toBe(false);
  });

  it('rejects a flyout panel without an id', () => {
    expect(
      buildRedirectUrlSchema.safeParse({ path: '/app/security', flyout: { right: { params: {} } } })
        .success
    ).toBe(false);
  });
});
