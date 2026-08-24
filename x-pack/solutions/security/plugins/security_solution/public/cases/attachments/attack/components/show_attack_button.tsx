/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { SHOW_ATTACK_BUTTON_TEST_ID } from '../../../../../common/cases/attachments/attack/test_ids';
import { AttackDetailsRightPanelKey } from '../../../../flyout/attack_details/constants/panel_keys';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';

const SHOW_ATTACK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.showAttackDetails',
  { defaultMessage: 'Show attack details' }
);

const ATTACK_UNAVAILABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.attackUnavailable',
  {
    defaultMessage:
      'This attack could not be loaded, so its details cannot be opened. It may have been deleted, aged into a frozen tier, or be outside your access.',
  }
);

export interface ShowAttackButtonProps {
  /** Id used to build the action's `data-test-subj` and DOM id, usually the attachment saved object id. */
  id: string;
  /** The attack document `_id`, saved as the attachment id. */
  attackId: string;
  /** The index the attack lives in, taken from the attachment metadata. */
  indexName: string;
  /** The attack title, used to label the flyout history entry. */
  attackTitle?: string;
  /**
   * Disables navigation when the attack document could not be resolved — there is nothing for
   * the flyout to open. The tooltip explains why instead of silently doing nothing.
   */
  isDisabled?: boolean;
}

/**
 * Navigates from a `security.attack` case attachment back to the attack it references, by
 * opening the attack flyout.
 */
export const ShowAttackButton = ({
  id,
  attackId,
  indexName,
  attackTitle,
  isDisabled = false,
}: ShowAttackButtonProps) => {
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openAttackFlyout } = useFlyoutApi();
  const { openFlyout } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    if (enableNewFlyout) {
      openAttackFlyout({
        attackId,
        indexName,
        attackTitle,
        origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      });
    } else {
      // Legacy expandable flyout path. No telemetry here — the new-flyout path reports
      // telemetry internally via openAttackFlyout, and the legacy path is being deprecated.
      openFlyout({
        right: {
          id: AttackDetailsRightPanelKey,
          params: { attackId, indexName },
        },
      });
    }
  }, [attackId, attackTitle, enableNewFlyout, indexName, openAttackFlyout, openFlyout]);

  return (
    <EuiToolTip
      position="top"
      content={<p>{isDisabled ? ATTACK_UNAVAILABLE_TOOLTIP : SHOW_ATTACK_TOOLTIP}</p>}
    >
      <EuiButtonIcon
        aria-label={SHOW_ATTACK_TOOLTIP}
        data-test-subj={`${SHOW_ATTACK_BUTTON_TEST_ID}-${id}`}
        disabled={isDisabled}
        onClick={onClick}
        iconType="chevronSingleRight"
        id={`${id}-show-attack`}
      />
    </EuiToolTip>
  );
};

ShowAttackButton.displayName = 'ShowAttackButton';
