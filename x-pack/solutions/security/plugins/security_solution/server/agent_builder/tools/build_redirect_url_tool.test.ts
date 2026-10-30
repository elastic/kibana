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
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import {
  buildRedirectUrlTool,
  buildRedirectUrlSchema,
  SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
} from './build_redirect_url_tool';

const SERVER_BASE_PATH = '/kbn';
const SPACE_ID = 'space-a';
const PREFIX = `${SERVER_BASE_PATH}/s/${SPACE_ID}`;

const coreSetup = {
  getStartServices: jest
    .fn()
    .mockResolvedValue([{ http: { basePath: { serverBasePath: SERVER_BASE_PATH } } }, {}]),
} as unknown as SecuritySolutionPluginCoreSetupDependencies;

const context = {
  logger: loggerMock.create(),
  spaceId: SPACE_ID,
} as never;

/** Decodes a named flyout query param back into its state (percent-decode + rison decode). */
const decodeQueryParam = (url: string, key: string) => {
  const param = new URLSearchParams(url.split('?')[1]).get(key);
  if (param == null) throw new Error(`no ${key} param in url`);
  return decode(param);
};

const decodeFlyoutV2 = (url: string) => decodeQueryParam(url, 'flyoutV2') as unknown[];

describe('buildRedirectUrlTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers as security.build_redirect_url', () => {
    expect(SECURITY_BUILD_REDIRECT_URL_TOOL_ID).toBe('security.build_redirect_url');
    expect(buildRedirectUrlTool(coreSetup).id).toBe(SECURITY_BUILD_REDIRECT_URL_TOOL_ID);
  });

  describe('base path + space prefixing', () => {
    it('prefixes an app-relative path with the base path and active space', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup).handler(
        { path: '/app/security/entity_analytics_management/risk_score' },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(
        `${PREFIX}/app/security/entity_analytics_management/risk_score`
      );
    });

    it('preserves a query string already present on the path', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup).handler(
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
        const { results } = (await buildRedirectUrlTool(coreSetup).handler(
          { path },
          context
        )) as ToolHandlerStandardReturn;
        expect(results[0].type).toBe(ToolResultType.error);
        expect((results[0].data as { message: string }).message).toContain('app-relative');
      }
    );
  });

  describe('flyout serialization', () => {
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

    it('translates expandable panels to a rison-encoded flyoutV2 query param', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup).handler(
        {
          path: '/app/security/entity_analytics_home_page',
          flyout: expandable,
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url.startsWith(`${PREFIX}/app/security/entity_analytics_home_page?flyoutV2=`)).toBe(
        true
      );
      expect(url).not.toContain('flyout=');
      expect(decodeFlyoutV2(url)).toEqual(expectedV2);
    });

    it('joins the flyoutV2 param with "&" when the path already has a query string', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup).handler(
        {
          path: '/app/security/entity_analytics_home_page?foo=bar',
          flyout: expandable,
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url).toContain('?foo=bar&flyoutV2=');
      expect(decodeFlyoutV2(url)).toEqual(expectedV2);
    });

    it('links to the page without a flyout param for panels with no v2 mapping', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup).handler(
        {
          path: '/app/security/entity_analytics_management/watchlists',
          flyout: { right: { id: 'unmigrated-panel', params: { someId: 'id-123' } } },
        },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(
        `${PREFIX}/app/security/entity_analytics_management/watchlists`
      );
    });

    it('does not append a flyout param when flyout has no panels', async () => {
      const { results } = (await buildRedirectUrlTool(coreSetup).handler(
        { path: '/app/security', flyout: {} },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(`${PREFIX}/app/security`);
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
        flyout: { right: { id: 'some-panel', params: { someId: 'id-1' } } },
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
