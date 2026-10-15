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
import { buildAttackAttachments } from '../../../../cases/attachments/attack';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ATTACK_ALERTS_TRUNCATED } from './translations';

/**
 * Builds the `getAttachments` callback that attaches an attack — and its constituent alerts — to
 * the case the user picks, warning when not every alert fits.
 *
 * Returns `undefined` when the attack cannot be posted as a `security.attack` attachment, either
 * because the attachment framework is off or because the caller has no attack to attach. Call
 * sites fall back to their markdown-comment payload in that case.
 */
export const useAttackCaseAttachments = (
  attackToAttach?: Omit<AttackToAttach, 'alertsIndex'>
): ((theCase?: CaseUI) => CaseAttachmentsWithoutOwner) | undefined => {
  const {
    services: { cases },
  } = useKibana();
  const { alertsIndexPattern } = useAssistantContext();
  const { addWarning } = useAppToasts();
  const attackAttachmentsEnabled = useIsExperimentalFeatureEnabled('attackAttachmentsEnabled');
  // The attack type is unified-only, so fall back to the markdown payload when the framework is off.
  const canAttachAttack =
    attackAttachmentsEnabled && cases.config.attachmentsEnabled && attackToAttach != null;

  const getAttachments = useCallback(
    (theCase?: CaseUI) => {
      if (attackToAttach == null) {
        return [];
      }

      const result = buildAttackAttachments(
        {
          ...attackToAttach,
          alertsIndex: alertsIndexPattern ?? '',
        },
        // A case holds at most MAX_ALERTS_PER_CASE alerts in total, so the attack's alerts have to
        // fit in whatever the chosen case has left. A case created from the flyout has none yet.
        { maxAlerts: MAX_ALERTS_PER_CASE - (theCase?.totalAlerts ?? 0) }
      );

      if (result.truncated) {
        // Raised as the attachments are posted, so it describes an attach that is actually
        // happening — but the request may still fail, hence the prospective wording.
        addWarning({
          title: ATTACK_ALERTS_TRUNCATED({
            alertCount: result.alertCount,
            attachedAlertCount: result.attachedAlertCount,
            maxAlertsPerCase: MAX_ALERTS_PER_CASE,
          }),
        });
      }

      return result.attachments;
    },
    [addWarning, alertsIndexPattern, attackToAttach]
  );

  return useMemo(
    () => (canAttachAttack ? getAttachments : undefined),
    [canAttachAttack, getAttachments]
  );
};
