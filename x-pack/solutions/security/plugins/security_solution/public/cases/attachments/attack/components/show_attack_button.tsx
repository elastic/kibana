/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SHOW_ATTACK_BUTTON_TEST_ID } from '../../../../../common/cases/attachments/attack/test_ids';
import { useOpenAttackFlyout } from '../hooks/use_open_attack_flyout';

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
  /** Used for the action's `data-test-subj` and DOM id, usually the attachment saved object id. */
  id: string;
  /** The attack document `_id`. */
  attackId: string;
  /** The index the attack lives in, taken from the attachment metadata. */
  indexName: string;
  /** The attack title, used to label the flyout history entry. */
  attackTitle?: string;
  /** Set when the attack document could not be resolved, so there is nothing to open. */
  isDisabled?: boolean;
}

/** Opens the attack flyout for a `security.attack` case attachment. */
export const ShowAttackButton = ({
  id,
  attackId,
  indexName,
  attackTitle,
  isDisabled = false,
}: ShowAttackButtonProps) => {
  const onClick = useOpenAttackFlyout({ attackId, indexName, attackTitle });

  return (
    <EuiToolTip
      position="top"
      content={<p>{isDisabled ? ATTACK_UNAVAILABLE_TOOLTIP : SHOW_ATTACK_TOOLTIP}</p>}
    >
      <EuiButtonIcon
        aria-label={SHOW_ATTACK_TOOLTIP}
        color="text"
        data-test-subj={`${SHOW_ATTACK_BUTTON_TEST_ID}-${id}`}
        disabled={isDisabled}
        onClick={onClick}
        iconType="maximize"
        id={`${id}-show-attack`}
      />
    </EuiToolTip>
  );
};

ShowAttackButton.displayName = 'ShowAttackButton';
