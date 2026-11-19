/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { SECURITY_ATTACK_ATTACHMENT_TYPE, type CaseUI } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public/types';
import { MAX_ALERTS_PER_CASE } from '@kbn/cases-plugin/common/constants';

import type { AttackAttachmentsResult, AttackToAttach } from '..';
import { buildAttacksAttachments, MAX_ATTACKS_PER_ATTACH } from '..';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { CaseAttachment } from '../utils';
import { isAttackAttachment } from '../utils';
import {
  ATTACK_ALERTS_TRUNCATED,
  ATTACKS_ALREADY_ATTACHED,
  ATTACKS_TRUNCATED,
} from '../translations';

export interface AttackCaseAttachments {
  /** Builds the attachments for a case; kept pure as the case selector calls it every render. */
  getAttachments: (theCase?: CaseUI) => CaseAttachmentsWithoutOwner;
  /**
   * Warns about anything that did not fit, or was already on the case, once the attachments have
   * been posted to `theCase`. `createdAttachments` are the attachments the server created; without
   * them, as for a new case or when the server added nothing, only what did not fit is reported.
   */
  onAttached: (theCase: CaseUI, createdAttachments?: readonly CaseAttachment[]) => void;
}

/** Counts the posted attacks the server did not create, as it drops those already on the case. */
const countAlreadyAttachedAttacks = (
  { attachments }: AttackAttachmentsResult,
  createdAttachments: readonly CaseAttachment[]
): number => {
  const createdAttackIds = new Set(
    createdAttachments.filter(isAttackAttachment).map(({ attachmentId }) => attachmentId)
  );

  return new Set(
    attachments.flatMap((attachment) =>
      attachment.type === SECURITY_ATTACK_ATTACHMENT_TYPE &&
      !createdAttackIds.has(attachment.attachmentId)
        ? [attachment.attachmentId]
        : []
    )
  ).size;
};

/**
 * Builds attack attachments sized to the chosen case, or `undefined` when attacks cannot be
 * attached so callers fall back to their markdown payload.
 */
export const useAttackCaseAttachments = (
  attacksToAttach?: ReadonlyArray<Omit<AttackToAttach, 'alertsIndex'>>
): AttackCaseAttachments | undefined => {
  const {
    services: { cases },
  } = useKibana();
  const { alertsIndexPattern } = useAssistantContext();
  const { addWarning } = useAppToasts();
  const isAttackAttachmentsEnabled = useIsExperimentalFeatureEnabled('attackAttachments');
  // The attack type is unified-only, so fall back to the markdown payload when the framework is off.
  const canAttachAttacks =
    isAttackAttachmentsEnabled &&
    cases.config.attachmentsEnabled &&
    attacksToAttach != null &&
    attacksToAttach.length > 0;

  const build = useCallback(
    (theCase?: CaseUI) =>
      buildAttacksAttachments(
        (attacksToAttach ?? []).map((attack) => ({
          ...attack,
          alertsIndex: alertsIndexPattern ?? '',
        })),
        // A case created from the flyout has no `totalAlerts` yet.
        { maxAlerts: MAX_ALERTS_PER_CASE - (theCase?.totalAlerts ?? 0) }
      ),
    [alertsIndexPattern, attacksToAttach]
  );

  const getAttachments = useCallback((theCase?: CaseUI) => build(theCase).attachments, [build]);

  // Rebuilding is pure, so it reports the same truncation the posted payload had.
  const onAttached = useCallback(
    (theCase: CaseUI, createdAttachments?: readonly CaseAttachment[]) => {
      const result = build(theCase);

      const alreadyAttachedCount =
        createdAttachments != null ? countAlreadyAttachedAttacks(result, createdAttachments) : 0;
      if (alreadyAttachedCount > 0) {
        addWarning({ title: ATTACKS_ALREADY_ATTACHED(alreadyAttachedCount) });
      }

      if (result.attacksTruncated) {
        addWarning({
          title: ATTACKS_TRUNCATED({
            attackCount: result.attackCount,
            attachedAttackCount: result.attachedAttackCount,
            maxAttacks: MAX_ATTACKS_PER_ATTACH,
          }),
        });
      }

      if (result.truncated) {
        addWarning({
          title: ATTACK_ALERTS_TRUNCATED({
            alertCount: result.alertCount,
            attachedAlertCount: result.attachedAlertCount,
            attackCount: result.attachedAttackCount,
            maxAlertsPerCase: MAX_ALERTS_PER_CASE,
          }),
        });
      }
    },
    [addWarning, build]
  );

  return useMemo(
    () => (canAttachAttacks ? { getAttachments, onAttached } : undefined),
    [canAttachAttacks, getAttachments, onAttached]
  );
};
