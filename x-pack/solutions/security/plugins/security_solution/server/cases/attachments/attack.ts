/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  AttachmentDeleteTarget,
  AttachmentOnDelete,
  UnifiedAttachmentTypeSetup,
} from '@kbn/cases-plugin/server';
import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  getOriginalAlertIds,
  transformInternalReplacements,
} from '@kbn/elastic-assistant-common';
import { z } from '@kbn/zod/v4';
import { AttackAttachmentPayloadSchema } from '../../../common/cases/attachments/attack';
import {
  getCaseAlertAttachments,
  resolveRemovableAlertAttachmentsForAttacks,
} from '../../../common/cases/attachments/attack/resolve_removable_alerts';

interface AttackAttachmentTypeDeps {
  getStartServices: CoreSetup['getStartServices'];
  logger: Logger;
}

interface AttackReference {
  attackId: string;
  index: string;
}

interface AttackAlertIdsSource {
  [ALERT_ATTACK_DISCOVERY_ALERT_IDS]?: string[];
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]?: Array<{ uuid: string; value: string }>;
}

// Stored attributes carry more than the attach payload, so this does not reuse the strict schema.
const StoredAttackAttachmentSchema = z.object({
  type: z.literal(SECURITY_ATTACK_ATTACHMENT_TYPE),
  attachmentId: z.string(),
  metadata: z.object({ index: z.string() }),
});

const toAttackReferences = (targets: readonly AttachmentDeleteTarget[]): AttackReference[] =>
  targets.flatMap(({ attributes }) => {
    const parsed = StoredAttackAttachmentSchema.safeParse(attributes);
    return parsed.success
      ? [{ attackId: parsed.data.attachmentId, index: parsed.data.metadata.index }]
      : [];
  });

/**
 * Reads each attack's current, de-anonymised alert ids as the requesting user. Attacks the user
 * cannot read, or that no longer exist, are absent from the result.
 */
const getAlertIdsByAttackId = async ({
  esClient,
  attacks,
  logger,
}: {
  esClient: ElasticsearchClient;
  attacks: readonly AttackReference[];
  logger: Logger;
}): Promise<Map<string, string[]>> => {
  const attackIdsByIndex = new Map<string, string[]>();
  for (const { attackId, index } of attacks) {
    attackIdsByIndex.set(index, [...(attackIdsByIndex.get(index) ?? []), attackId]);
  }

  const alertIdsByAttackId = new Map<string, string[]>();
  for (const [index, attackIds] of attackIdsByIndex) {
    try {
      const { hits } = await esClient.search<AttackAlertIdsSource>({
        index,
        size: attackIds.length,
        query: { ids: { values: attackIds } },
        _source: [ALERT_ATTACK_DISCOVERY_ALERT_IDS, ALERT_ATTACK_DISCOVERY_REPLACEMENTS],
        ignore_unavailable: true,
      });

      for (const { _id: id, _source: source } of hits.hits) {
        if (id != null && source != null) {
          const replacementsSource = source[ALERT_ATTACK_DISCOVERY_REPLACEMENTS];
          const replacements = Array.isArray(replacementsSource)
            ? transformInternalReplacements(replacementsSource)
            : undefined;
          const alertIds = getOriginalAlertIds({
            alertIds: source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] ?? [],
            replacements,
          });
          alertIdsByAttackId.set(id, [...new Set(alertIds)]);
        }
      }
    } catch (error) {
      // An unreadable attack leaves its alerts on the case rather than blocking the deletion.
      logger.debug(`Unable to read attacks in ${index} to resolve their alerts: ${error}`);
    }
  }

  return alertIdsByAttackId;
};

/**
 * Takes the alert attachments an attack brought to the case with it when the attack is deleted,
 * keeping any alert another attached attack still claims.
 */
export const getAttackOnDelete =
  ({ getStartServices, logger }: AttackAttachmentTypeDeps): AttachmentOnDelete =>
  async ({ request, attachments, remainingAttachments }) => {
    const removedAttacks = toAttackReferences(attachments);
    const alertAttachments = getCaseAlertAttachments(
      remainingAttachments.map(({ id, attributes }) => ({ ...attributes, id }))
    );

    if (removedAttacks.length === 0 || alertAttachments.length === 0) {
      return { relatedAttachmentIds: [] };
    }

    const otherAttacks = toAttackReferences(remainingAttachments);
    const [coreStart] = await getStartServices();
    const alertIdsByAttackId = await getAlertIdsByAttackId({
      esClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
      attacks: [...removedAttacks, ...otherAttacks],
      logger,
    });

    const { attachmentIds } = resolveRemovableAlertAttachmentsForAttacks({
      removedAttackIds: removedAttacks.map(({ attackId }) => attackId),
      otherAttackIds: otherAttacks.map(({ attackId }) => attackId),
      alertIdsByAttackId,
      alertAttachments,
    });

    return { relatedAttachmentIds: attachmentIds };
  };

/**
 * Server-side attack attachment type registration.
 * Uses a zod schema (shared with the client) to validate the full payload.
 */
export const getAttackAttachmentType = (
  deps: AttackAttachmentTypeDeps
): UnifiedAttachmentTypeSetup => ({
  id: SECURITY_ATTACK_ATTACHMENT_TYPE,
  schema: AttackAttachmentPayloadSchema,
  onDelete: getAttackOnDelete(deps),
});
