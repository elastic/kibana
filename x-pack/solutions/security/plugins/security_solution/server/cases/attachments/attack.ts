/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  AttachmentDeleteTarget,
  GetRelatedAttachments,
  UnifiedAttachmentTypeSetup,
} from '@kbn/cases-plugin/server';
import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  getOriginalAlertIds,
  toReadableAttackIndexPattern,
  transformInternalReplacements,
} from '@kbn/elastic-assistant-common';
import { isResponseError } from '@kbn/es-errors';
import { z } from '@kbn/zod/v4';
import { AttackAttachmentPayloadSchema } from '../../../common/cases/attachments/attack';
import { validateAttackWorkflowTargets } from './workflow_validation';
import { getCaseAlertAttachments, resolveRemovableAlertIds } from './resolve_removable_alerts';

interface AttackAttachmentTypeDeps {
  getStartServices: CoreSetup['getStartServices'];
  logger: Logger;
  isAttachEnabled: boolean;
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

/**
 * Stands in for the payload schema while `attackAttachments` is off, refusing every
 * attach with an explanation rather than the framework's "type is not registered".
 */
const AttachDisabledSchema = z.never({
  error: `Attaching ${SECURITY_ATTACK_ATTACHMENT_TYPE} attachments requires the attackAttachments feature flag`,
});

const toAttackReferences = (targets: readonly AttachmentDeleteTarget[]): AttackReference[] =>
  targets.flatMap(({ attributes }) => {
    const parsed = StoredAttackAttachmentSchema.safeParse(attributes);
    return parsed.success
      ? [
          {
            attackId: parsed.data.attachmentId,
            // Users usually hold read on the alias pattern, not on the stored backing index.
            index: toReadableAttackIndexPattern(parsed.data.metadata.index),
          },
        ]
      : [];
  });

const isUnauthorizedRead = (error: unknown): boolean =>
  isResponseError(error) &&
  (error.statusCode === 403 || error.body?.error?.type === 'security_exception');

/**
 * Reads each attack's current, de-anonymised alert ids as the requesting user. Attacks the user
 * cannot read, or that no longer exist, are absent from the result. Any other read failure is
 * thrown, failing the deletion rather than silently keeping the attack's alerts.
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
        const storedAlertIds = source?.[ALERT_ATTACK_DISCOVERY_ALERT_IDS];

        // Without its alert ids an attack cannot be told apart from one claiming no alerts, which
        // would free the alerts it shares; it is left unresolved instead.
        if (id != null && source != null && Array.isArray(storedAlertIds)) {
          const replacementsSource = source[ALERT_ATTACK_DISCOVERY_REPLACEMENTS];
          const replacements = Array.isArray(replacementsSource)
            ? transformInternalReplacements(replacementsSource)
            : undefined;
          const alertIds = getOriginalAlertIds({ alertIds: storedAlertIds, replacements });
          alertIdsByAttackId.set(id, [...new Set(alertIds)]);
        }
      }
    } catch (error) {
      if (!isUnauthorizedRead(error)) {
        throw error;
      }

      // An unreadable attack leaves its alerts on the case rather than blocking the deletion.
      logger.debug(`Unable to read attacks in ${index} to resolve their alerts: ${error}`);
    }
  }

  return alertIdsByAttackId;
};

/**
 * Takes the alerts an attack brought to the case with it when the attack is deleted, keeping any
 * alert another attached attack still claims.
 */
export const getAttackRelatedAttachments =
  ({
    getStartServices,
    logger,
  }: Omit<AttackAttachmentTypeDeps, 'isAttachEnabled'>): GetRelatedAttachments =>
  async ({ request, attachments, remainingAttachments }) => {
    const removedAttacks = toAttackReferences(attachments);
    const alertAttachments = getCaseAlertAttachments(
      remainingAttachments.map(({ id, attributes }) => ({ ...attributes, id }))
    );

    if (removedAttacks.length === 0 || !alertAttachments.some(({ isFromAttack }) => isFromAttack)) {
      return [];
    }

    const otherAttacks = toAttackReferences(remainingAttachments);
    const [coreStart] = await getStartServices();
    const alertIdsByAttackId = await getAlertIdsByAttackId({
      esClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
      attacks: [...removedAttacks, ...otherAttacks],
      logger,
    });

    const alertIds = resolveRemovableAlertIds({
      removedAttackIds: removedAttacks.map(({ attackId }) => attackId),
      otherAttackIds: otherAttacks.map(({ attackId }) => attackId),
      alertIdsByAttackId,
      alertAttachments,
    });

    return alertIds.length > 0
      ? [{ type: SECURITY_ALERT_ATTACHMENT_TYPE, attachmentIds: alertIds }]
      : [];
  };

/**
 * Server-side attack attachment type registration.
 * Uses a zod schema (shared with the client) to validate the full payload.
 */
export const getAttackAttachmentType = (
  deps: AttackAttachmentTypeDeps
): UnifiedAttachmentTypeSetup => ({
  id: SECURITY_ATTACK_ATTACHMENT_TYPE,
  schema: deps.isAttachEnabled ? AttackAttachmentPayloadSchema : AttachDisabledSchema,
  relatedAttachments: {
    readTypes: [SECURITY_ATTACK_ATTACHMENT_TYPE, SECURITY_ALERT_ATTACHMENT_TYPE],
    get: getAttackRelatedAttachments(deps),
  },
  workflow: { validateTargets: validateAttackWorkflowTargets },
});
