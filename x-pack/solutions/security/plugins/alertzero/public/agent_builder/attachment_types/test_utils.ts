/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

/**
 * Minimal SharePluginStart stub for attachment renderer/definition tests: resolves any
 * ES|QL query or Discover filters payload to a deterministic https://example.test/discover
 * URL so assertions can check the exact href without depending on the real locator.
 */
export const createMockShare = (): SharePluginStart =>
  ({
    url: {
      locators: {
        get: () => ({
          getRedirectUrl: (params: { query?: { esql?: string }; filters?: unknown[] }) => {
            if (params.query?.esql) {
              return `https://example.test/discover?esql=${encodeURIComponent(params.query.esql)}`;
            }
            if (params.filters) {
              return `https://example.test/discover?nested=${encodeURIComponent(
                JSON.stringify(params.filters)
              )}`;
            }
            return 'https://example.test/discover';
          },
        }),
      },
    },
  } as unknown as SharePluginStart);

/** Minimal AttachmentNavigationDeps stub shared by attachment renderer/definition tests. */
export const createMockNavigation = <T extends object = {}>(
  overrides?: T
): { spaceId: string; prependPath: (path: string) => string } & T =>
  ({
    spaceId: 'default',
    prependPath: (path: string) => path,
    ...overrides,
  } as { spaceId: string; prependPath: (path: string) => string } & T);

/** Builds a minimal typed Attachment fixture for a given attachment type id and data shape. */
export const buildAttachment = <TType extends string, TData>(
  type: TType,
  data: TData,
  id = 'att-1'
): Attachment<TType, TData> => ({ id, type, data } as Attachment<TType, TData>);

/** Builds the props an inline-content renderer expects, with an optional navigation override. */
export const renderProps = <TType extends string, TData, TNav extends object>(
  attachment: Attachment<TType, TData>,
  navigation: TNav = createMockNavigation() as unknown as TNav
) => ({
  attachment,
  navigation,
  isSidebar: false,
});
