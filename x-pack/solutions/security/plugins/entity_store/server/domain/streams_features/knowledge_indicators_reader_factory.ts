/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import type { EntityStoreCoreSetup } from '../../types';

/**
 * No-op reader returned when the streams plugin is not enabled in the
 * deployment (it's an optional dependency in entity_store's `kibana.jsonc`).
 *
 * Returning empty arrays — rather than `null` or throwing — lets callers in
 * the extract task and entity maintainers drive a uniform "no Knowledge
 * Indicators to process" branch without scattering `if (reader)` guards
 * through the task flow. The semantics also align with `resolveIndexPatterns`'s
 * documented behavior of returning `[]` for missing streams.
 */
const NO_OP_KI_READER: StreamsKnowledgeIndicatorsReader = {
  listEntityFeatures: async () => [],
  listDependencyFeatures: async () => [],
  listSchemaFeatures: async () => [],
  resolveIndexPatterns: async () => [],
};

/**
 * Resolves a request-scoped `StreamsKnowledgeIndicatorsReader` for the given
 * `fakeRequest`. Use this from any entity-store flow that needs to read
 * Knowledge Indicators or resolve stream-backed index patterns.
 *
 * Behavior:
 * - When streams is enabled, delegates to
 *   `streamsStart.getKnowledgeIndicatorsReader({ request })`. The returned
 *   reader inherits the request's auth / space scoping.
 * - When streams is NOT enabled (optional dependency missing), returns
 *   `NO_OP_KI_READER` and logs a single debug line. Subsequent calls also
 *   return the same no-op reader; entity store keeps functioning without
 *   stream-derived entities.
 */
export const createKnowledgeIndicatorsReader = async ({
  core,
  fakeRequest,
  logger,
}: {
  core: EntityStoreCoreSetup;
  fakeRequest: KibanaRequest;
  logger: Logger;
}): Promise<StreamsKnowledgeIndicatorsReader> => {
  const [, pluginsStart] = await core.getStartServices();
  if (!pluginsStart.streams) {
    logger.debug(
      'Streams plugin not available; Knowledge Indicators reader will return empty results'
    );
    return NO_OP_KI_READER;
  }
  return pluginsStart.streams.getKnowledgeIndicatorsReader({ request: fakeRequest });
};

/** Exported for tests so they can assert reference-equality against the fallback. */
export const __NO_OP_KI_READER_FOR_TESTING = NO_OP_KI_READER;
