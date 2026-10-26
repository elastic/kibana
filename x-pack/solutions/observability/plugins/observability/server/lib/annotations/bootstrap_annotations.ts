/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  PluginInitializerContext,
  KibanaRequest,
  IScopedClusterClient,
} from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { createAnnotationsClient } from './create_annotations_client';
import { registerAnnotationAPIs } from './register_annotation_apis';
import { createOrUpdateIndexTemplate } from '../../utils/create_or_update_index_template';
import { ANNOTATION_MAPPINGS } from './mappings/annotation_mappings';

interface Params {
  index: string;
  core: CoreSetup;
  context: PluginInitializerContext;
}

export type ScopedAnnotationsClientFactory = Awaited<
  ReturnType<typeof bootstrapAnnotations>
>['getScopedAnnotationsClient'];

export type ScopedAnnotationsClient = Awaited<ReturnType<ScopedAnnotationsClientFactory>>;
export type AnnotationsAPI = Awaited<ReturnType<typeof bootstrapAnnotations>>;

export async function bootstrapAnnotations({ index, core, context }: Params) {
  const logger = context.logger.get('annotations');

  registerAnnotationAPIs({
    core,
    index,
    logger,
  });

  // Install an index template so that when the index is auto-created on first write,
  // it gets the correct mappings (keyword types for service.name, tags, etc.).
  const [coreStart] = await core.getStartServices();
  const internalClient = coreStart.elasticsearch.client.asInternalUser;

  try {
    await createOrUpdateIndexTemplate({
      indexTemplate: {
        name: `${index}-template`,
        index_patterns: [index],
        template: {
          settings: {
            auto_expand_replicas: '0-1',
          },
          mappings: ANNOTATION_MAPPINGS,
        },
      },
      client: internalClient,
      logger,
    });
    logger.debug(`Installed index template for ${index}`);
  } catch (e) {
    logger.error(`Failed to install index template for ${index}`, { error: e });
  }

  return {
    getScopedAnnotationsClient: async (
      requestContext: {
        core: Promise<{ elasticsearch: { client: IScopedClusterClient } }>;
        licensing: Promise<LicensingApiRequestHandlerContext>;
      },
      request: KibanaRequest
    ) => {
      const esClient = (await requestContext.core).elasticsearch.client;
      const { license } = await requestContext.licensing;
      return createAnnotationsClient({
        index,
        esClient: esClient.asCurrentUser,
        logger,
        license,
      });
    },
  };
}
