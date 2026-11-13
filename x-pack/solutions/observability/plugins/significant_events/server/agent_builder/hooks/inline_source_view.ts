/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegExp } from 'lodash';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type { Logger } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_SOURCE_VIEW_PREFIX } from '@kbn/nightshift-shared';
import type { GetScopedClients } from '../../routes/types';
import { listAllSources } from '../../routes/utils/list_all_sources';

const INLINE_SOURCE_VIEW_HOOK_ID = 'significant-events-inline-source-view';

const SOURCE_VIEW_FROM = new RegExp(
  `^\\s*FROM\\s+("?)(${escapeRegExp(NIGHTSHIFT_SOURCE_VIEW_PREFIX)}[^\\s"|,]+)\\1\\s*(?=\\||$)`,
  'i'
);

/** Replaces a leading `FROM <source view>` with the query the view is built from. */
export const inlineSourceView = (
  query: string,
  sources: ReadonlyArray<Pick<NightshiftSource, 'view_name' | 'esql'>>
): string => {
  const match = SOURCE_VIEW_FROM.exec(query);
  if (!match) {
    return query;
  }
  const [from, , viewName] = match;
  const source = sources.find(({ view_name: name }) => name === viewName);
  if (!source) {
    return query;
  }
  // Newline, so a trailing line comment in the source query cannot swallow the rest.
  return `${source.esql.trim()}\n${query.slice(from.length)}`;
};

/**
 * Keeps STATS/SORT/LIMIT pushdown, which `execute_esql`'s frozen-tier request filter disables
 * through a view that has a WHERE.
 */
export const registerInlineSourceViewHook = ({
  agentBuilder,
  getScopedClients,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  logger: Logger;
}): void => {
  agentBuilder.hooks.register({
    id: INLINE_SOURCE_VIEW_HOOK_ID,
    hooks: {
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: async ({ toolId, toolParams, request }) => {
          const { query } = toolParams;
          if (
            toolId !== platformCoreTools.executeEsql ||
            typeof query !== 'string' ||
            !SOURCE_VIEW_FROM.test(query)
          ) {
            return;
          }

          try {
            const { sourcesClient } = await getScopedClients({ request });
            const inlined = inlineSourceView(query, await listAllSources(sourcesClient));
            return { toolParams: { ...toolParams, query: inlined } };
          } catch (error) {
            logger.warn(
              `Could not inline the source view, running the query as written: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        },
      },
    },
  });
};
