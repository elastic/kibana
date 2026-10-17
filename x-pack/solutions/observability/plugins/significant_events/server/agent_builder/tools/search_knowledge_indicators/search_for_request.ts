/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import { assertCanReadSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import {
  loadSourceCatalog,
  resolveSourcesBySlug,
  restrictCatalogToReadable,
} from '../../utils/resolve_source_slugs';
import { searchKnowledgeIndicatorsToolHandler, type KISearchOutput } from './handler';
import type { SearchKnowledgeIndicatorsParams } from './tool';

export const MAX_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE = 50;
export const KI_SEARCH_MAX_PER_PAGE_FULL = 10;

/**
 * Runs a KI search as the caller: access checks, source scoping and per-page caps are the ones
 * the `ki_search` tool applies. Throws on failure; the tool turns that into a tool error.
 */
export const searchKnowledgeIndicatorsForRequest = async ({
  request,
  getScopedClients,
  server,
  logger,
  toolParams,
}: {
  request: KibanaRequest;
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  toolParams: SearchKnowledgeIndicatorsParams;
}): Promise<KISearchOutput> => {
  const scopedClients = await getScopedClients({ request });

  await assertSignificantEventsAccess({
    server,
    licensing: scopedClients.licensing,
  });
  await assertCanReadSignificantEvents({ request, server });

  const { view, slugs, ...restParams } = toolParams;
  const maxPerPage =
    view === 'full' ? KI_SEARCH_MAX_PER_PAGE_FULL : MAX_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE;
  const fullCatalog = await loadSourceCatalog(scopedClients.sourcesClient);
  const sources = slugs ? resolveSourcesBySlug(fullCatalog, slugs) : undefined;
  // Stored KIs are read as the internal user, so check the caller's own data access first.
  // Named sources must all be readable; an unscoped search covers only the readable ones.
  if (sources) {
    await Promise.all(sources.map(({ id }) => scopedClients.sourcesClient.assertReadable(id)));
  }
  const catalog = sources
    ? fullCatalog
    : await restrictCatalogToReadable(fullCatalog, scopedClients.sourcesClient);
  const kiClient = await scopedClients.getKnowledgeIndicatorClient();
  const params = {
    ...restParams,
    ...(sources ? { source_ids: sources.map((source) => source.id) } : {}),
    per_page: Math.min(restParams.per_page, maxPerPage),
  };

  return searchKnowledgeIndicatorsToolHandler({
    catalog,
    sources,
    kiClient,
    logger,
    params,
    view,
  });
};
