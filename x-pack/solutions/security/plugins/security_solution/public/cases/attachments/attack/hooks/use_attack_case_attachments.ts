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

import type { AttackToAttach } from '..';
import { buildAttacksAttachments, MAX_ATTACKS_PER_ATTACH } from '..';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ATTACK_ALERTS_TRUNCATED, ATTACKS_TRUNCATED } from '../translations';

export interface AttackCaseAttachments {
  /** Builds the attachments for a case; kept pure as the case selector calls it every render. */
  getAttachments: (theCase?: CaseUI) => CaseAttachmentsWithoutOwner;
  /** Warns about anything that did not fit, once the attachments have been posted to `theCase`. */
  onAttached: (theCase: CaseUI) => void;
}

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
    (theCase: CaseUI) => {
      const result = build(theCase);

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
