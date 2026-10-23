/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { ZodObject } from '@kbn/zod/v4';
import type { z } from '@kbn/zod/v4';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { KnowledgeIndicatorClient } from '../../lib/knowledge_indicators';
import type { RouteHandlerScopedClients, GetScopedClients } from '../../routes/types';
import type { SignificantEventsServer } from '../../types';

/**
 * Subset of RouteHandlerScopedClients that tools actually use.
 * Using Pick ensures property names and types stay in sync with the
 * real interface — renames or type changes cause a compile error here.
 */
type ToolScopedClients = Pick<
  RouteHandlerScopedClients,
  'scopedClusterClient' | 'getKnowledgeIndicatorClient' | 'uiSettingsClient'
>;

export const createMockGetScopedClients = () => {
  const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const esClient = scopedClusterClient.asCurrentUser;

  const uiSettingsClient: jest.Mocked<Pick<IUiSettingsClient, 'get'>> = {
    // Query streams enabled by default; individual tests can override.
    get: jest.fn().mockResolvedValue(true),
  };

  const kiClient: jest.Mocked<Pick<KnowledgeIndicatorClient, 'getSourceToQueryLinksMap'>> = {
    getSourceToQueryLinksMap: jest.fn().mockResolvedValue({}),
  };

  const getKnowledgeIndicatorClient = jest.fn().mockResolvedValue(kiClient);

  // Satisfies ensures property names stay in sync with RouteHandlerScopedClients.
  // If a property is renamed or removed from the interface, this will fail.
  const scopedClients: {
    [K in keyof ToolScopedClients]: unknown;
  } = {
    scopedClusterClient,
    getKnowledgeIndicatorClient,
    uiSettingsClient,
  };

  const getScopedClients = jest
    .fn()
    .mockResolvedValue(scopedClients) as jest.MockedFunction<GetScopedClients>;

  return {
    getScopedClients,
    esClient,
    scopedClusterClient,
    getKnowledgeIndicatorClient,
    uiSettingsClient,
  };
};

/** A source whose id equals its slug, so tool tests can keep the old stream-name strings. */
export const sourceWithSlug = (
  slug: string,
  overrides: Partial<NightshiftSource> = {}
): NightshiftSource => ({
  id: slug,
  title: slug,
  tags: [],
  esql: '',
  type: 'unknown',
  slug,
  view_name: `$.nightshift.sources.default.${slug}`,
  enabled: true,
  created_by: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  esql_updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const mockSourcesClient = (slugs: readonly string[]) => ({
  list: jest.fn().mockResolvedValue({
    sources: slugs.map((slug) => sourceWithSlug(slug)),
    total: slugs.length,
  }),
  assertReadable: jest.fn().mockResolvedValue(undefined),
});

export const createMockRequest = () => httpServerMock.createKibanaRequest();

export const invokeHandler = async <TSchema extends ZodObject<any>>(
  tool: BuiltinSkillBoundedTool<TSchema> | BuiltinToolDefinition<TSchema>,
  input: z.infer<TSchema>,
  context: ToolHandlerContext
) => {
  return tool.handler(input, context);
};

export const createMockToolContext = (): ToolHandlerContext => {
  const inferenceClient = {
    chatComplete: jest.fn(),
    output: jest.fn(),
  };

  const modelProvider = agentBuilderMocks.createModelProvider();
  modelProvider.getDefaultModel.mockResolvedValue({ inferenceClient } as never);
  const toolHandlerContext = agentBuilderMocks.tools.createHandlerContext();

  toolHandlerContext.modelProvider = modelProvider;
  return toolHandlerContext;
};

/** Nightshift feature privilege of a role: `all` always includes `read`, so manage never comes without read. */
export type NightshiftFeaturePrivilege = 'none' | 'read' | 'all';

const API_PRIVILEGES_BY_FEATURE_PRIVILEGE: Record<NightshiftFeaturePrivilege, readonly string[]> = {
  none: [],
  read: [NIGHTSHIFT_API_PRIVILEGES.read],
  all: [NIGHTSHIFT_API_PRIVILEGES.read, NIGHTSHIFT_API_PRIVILEGES.manage],
};

/**
 * A server whose Kibana privilege check behaves like a user with `featurePrivilege` on Nightshift:
 * a check passes only when every requested API privilege is granted by it. Only `security` is
 * real, so mock any other server dependency (e.g. `assertSignificantEventsAccess`).
 */
export const createSignificantEventsServer = ({
  featurePrivilege,
}: {
  featurePrivilege: NightshiftFeaturePrivilege;
}): SignificantEventsServer => {
  const security = securityMock.createStart();
  const toApiAction = (privilege: string) => `api:${privilege}`;
  jest.spyOn(security.authz.actions.api, 'get').mockImplementation(toApiAction);

  const grantedActions = new Set(
    API_PRIVILEGES_BY_FEATURE_PRIVILEGE[featurePrivilege].map(toApiAction)
  );
  security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
    jest.fn(async ({ kibana = [] }: { kibana?: string | string[] }) => ({
      hasAllRequested: [kibana].flat().every((action) => grantedActions.has(action)),
    }))
  );
  const server: Pick<SignificantEventsServer, 'security'> = { security };
  return server as SignificantEventsServer;
};
