/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { CaseUI } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public/types';
import { MAX_ALERTS_PER_CASE } from '@kbn/cases-plugin/common/constants';

import type { AttackToAttach } from '../../../../cases/attachments/attack';
import {
  buildAttacksAttachments,
  MAX_ATTACKS_PER_ATTACH,
} from '../../../../cases/attachments/attack';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ATTACK_ALERTS_TRUNCATED, ATTACKS_TRUNCATED } from './translations';

/**
 * Builds the `getAttachments` callback that attaches one or more attacks — and the alerts they
 * comprise — to the case the user picks, warning when not everything fits.
 *
 * Returns `undefined` when the attacks cannot be posted as `security.attack` attachments, either
 * because the attachment framework is off or because the caller has nothing attachable. Call
 * sites fall back to their markdown-comment payload in that case.
 *
 * @param attacksToAttach the attacks to attach, in the order they should be attached
 */
export const useAttackCaseAttachments = (
  attacksToAttach?: ReadonlyArray<Omit<AttackToAttach, 'alertsIndex'>>
): ((theCase?: CaseUI) => CaseAttachmentsWithoutOwner) | undefined => {
  const {
    services: { cases },
  } = useKibana();
  const { alertsIndexPattern } = useAssistantContext();
  const { addWarning } = useAppToasts();
  const attackAttachmentsEnabled = useIsExperimentalFeatureEnabled('attackAttachmentsEnabled');
  // The attack type is unified-only, so fall back to the markdown payload when the framework is off.
  const canAttachAttacks =
    attackAttachmentsEnabled &&
    cases.config.attachmentsEnabled &&
    attacksToAttach != null &&
    attacksToAttach.length > 0;

  const getAttachments = useCallback(
    (theCase?: CaseUI) => {
      if (attacksToAttach == null) {
        return [];
      }

      const result = buildAttacksAttachments(
        attacksToAttach.map((attack) => ({ ...attack, alertsIndex: alertsIndexPattern ?? '' })),
        // A case holds at most MAX_ALERTS_PER_CASE alerts in total, so the attacks' alerts have to
        // fit in whatever the chosen case has left. A case created from the flyout has none yet.
        { maxAlerts: MAX_ALERTS_PER_CASE - (theCase?.totalAlerts ?? 0) }
      );

      // Raised as the attachments are posted, so they describe an attach that is actually
      // happening — but the request may still fail, hence the prospective wording.
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

      return result.attachments;
    },
    [addWarning, alertsIndexPattern, attacksToAttach]
  );

  return useMemo(
    () => (canAttachAttacks ? getAttachments : undefined),
    [canAttachAttacks, getAttachments]
  );
};
