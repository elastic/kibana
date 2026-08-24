/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import { useKibana } from '../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import type { RemovableAlertAttachments } from '../resolve_removable_alerts';
import {
  getCaseAlertAttachments,
  resolveRemovableAlertAttachments,
} from '../resolve_removable_alerts';
import type { CaseAttachment } from '../utils';
import { isAttackAttachment } from '../utils';

export interface UseRemovableAlertAttachmentsResult extends RemovableAlertAttachments {
  /** True while the attacks are being resolved. Nothing is removable until this settles. */
  isLoading: boolean;
}

const LOADING: UseRemovableAlertAttachmentsResult = {
  isLoading: true,
  attachmentIds: [],
  alertIds: [],
  isResolvable: false,
};

/**
 * Resolves which of the case's alert attachments may be removed alongside the attack attachment
 * identified by `attackId`.
 *
 * The attack alert sets are read live rather than from attachment metadata — see
 * {@link resolveRemovableAlertAttachments} for why — so every attack attached to the case is
 * fetched in one request: the one being removed, and the others whose claims exclude alerts from
 * the result. Mount this only once the user has asked to remove something; it costs a request.
 *
 * @param comments the case's attachments.
 * @param attackId the attack document id of the attachment being removed.
 */
export const useRemovableAlertAttachments = ({
  comments,
  attackId,
}: {
  comments: readonly CaseAttachment[];
  attackId: string;
}): UseRemovableAlertAttachmentsResult => {
  const { http } = useKibana().services;
  const { isAssistantEnabled } = useAssistantAvailability();

  // The same attack can only be attached once, but dedupe anyway: the ids form the query key.
  const attackIds = useMemo(
    () => [
      ...new Set(
        comments.flatMap((comment) => (isAttackAttachment(comment) ? [comment.attachmentId] : []))
      ),
    ],
    [comments]
  );

  const { data, isLoading, status } = useFindAttackDiscoveries({
    http,
    ids: attackIds,
    // Attacks attached by a teammate belong to the case regardless of who generated them.
    includeAllAuthors: true,
    // `_find` defaults to 10 per page, which would leave later attacks looking unresolvable.
    perPage: Math.max(attackIds.length, 1),
    // The hook has no separate `enabled` flag; this doubles as one.
    isAssistantEnabled,
  });

  // Absent for any attack the query did not return — deleted, aged into a frozen tier, or outside
  // the user's access. `resolveRemovableAlertAttachments` turns that into an unresolvable result.
  const alertIdsByAttackId = useMemo(() => {
    const byId = new Map<string, string[]>();
    for (const attack of data?.data ?? []) {
      // De-anonymise before deduping: distinct anonymised ids can resolve to the same alert.
      byId.set(attack.id, [
        ...new Set(
          getOriginalAlertIds({ alertIds: attack.alertIds, replacements: attack.replacements })
        ),
      ]);
    }
    return byId;
  }, [data?.data]);

  const alertAttachments = useMemo(() => getCaseAlertAttachments(comments), [comments]);

  const hasSettled = !isLoading && status !== 'idle';

  return useMemo(() => {
    if (!hasSettled) {
      return LOADING;
    }

    return {
      isLoading: false,
      ...resolveRemovableAlertAttachments({
        attackAlertIds: alertIdsByAttackId.get(attackId),
        alertAttachments,
        otherAttackAlertIds: attackIds
          .filter((id) => id !== attackId)
          .map((id) => alertIdsByAttackId.get(id)),
      }),
    };
  }, [alertAttachments, alertIdsByAttackId, attackId, attackIds, hasSettled]);
};
