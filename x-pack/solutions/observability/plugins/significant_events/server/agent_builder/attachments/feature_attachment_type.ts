/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/core/server';
import { featureSchema, type Feature } from '@kbn/significant-events-schema';
import { decodeFeatureAttachmentOrigin, KI_FEATURE_ATTACHMENT_TYPE } from '../../../common';
import type { GetScopedClients } from '../../routes/types';
import { loadSourceCatalog, presentSlug } from '../utils/resolve_source_slugs';

interface CreateSignificantEventFeatureAttachmentTypeOptions {
  logger: Logger;
  getScopedClients: GetScopedClients;
}

export const formatFeatureAsText = (
  feature: Feature,
  sourceLabel = feature.stream_name
): string => {
  const title = feature.title ?? feature.id;
  return [
    `Knowledge Indicator feature "${title}"`,
    `Feature ID: ${feature.id}`,
    `Source: ${sourceLabel}`,
    `Type: ${feature.type}${feature.subtype ? ` (${feature.subtype})` : ''}`,
    feature.confidence > 0 ? `Confidence: ${feature.confidence}%` : undefined,
    feature.description ? `Description: ${feature.description}` : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
};

export const createSignificantEventFeatureAttachmentType = ({
  logger,
  getScopedClients,
}: CreateSignificantEventFeatureAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof KI_FEATURE_ATTACHMENT_TYPE,
  Feature
> => {
  const fetchFeature = async (
    origin: string,
    context: AttachmentResolveContext
  ): Promise<Feature | undefined> => {
    const decoded = decodeFeatureAttachmentOrigin(origin);
    if (!decoded) {
      return undefined;
    }

    const { getKnowledgeIndicatorClient } = await getScopedClients({ request: context.request });
    const kiClient = await getKnowledgeIndicatorClient();

    try {
      return await kiClient.getFeature(decoded.streamName, decoded.featureId);
    } catch (error) {
      logger.warn(`Failed to resolve feature attachment for origin "${origin}": ${String(error)}`);
      return undefined;
    }
  };

  return {
    id: KI_FEATURE_ATTACHMENT_TYPE,
    isReadonly: true,
    validate: (input) => {
      const parseResult = featureSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    resolve: async (origin, context) => fetchFeature(origin, context),
    isStale: async (
      attachment: VersionedAttachment<typeof KI_FEATURE_ATTACHMENT_TYPE, Feature>,
      context
    ): Promise<boolean> => {
      if (!attachment.origin) {
        return false;
      }

      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) {
        return false;
      }

      try {
        const latestFeature = await fetchFeature(attachment.origin, context);
        return !latestFeature || latestVersion.data.uuid !== latestFeature.uuid;
      } catch (error) {
        logger.warn(
          `Failed to check staleness for feature attachment "${attachment.origin}": ${String(
            error
          )}`
        );
        return false;
      }
    },
    format: async (attachment, context) => {
      let sourceLabel = attachment.data.stream_name;
      try {
        const { sourcesClient } = await getScopedClients({ request: context.request });
        const catalog = await loadSourceCatalog(sourcesClient);
        sourceLabel = presentSlug(catalog, attachment.data.stream_name);
      } catch (error) {
        logger.warn(`Failed to resolve source slug for feature attachment: ${String(error)}`);
      }

      return {
        getRepresentation: () => ({
          type: 'text',
          value: formatFeatureAsText(attachment.data, sourceLabel),
        }),
      };
    },
    getAgentDescription: () =>
      'A Significant Events knowledge indicator feature attachment represents a discovered entity or operational pattern on a source. Use it as authoritative context about the attached feature when answering questions.',
    getTools: () => [],
  };
};
