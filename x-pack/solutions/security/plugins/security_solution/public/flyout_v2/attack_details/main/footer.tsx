/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { isNonLocalIndexName } from '@kbn/es-query';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AttacksGroupTakeActionItems } from '../../../detections/components/attacks/table/attacks_group_take_action_items';
import { AttackAiAssistantButton } from '../../../detections/components/attacks/table/attack_details/attack_ai_assistant_button';
import {
  FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID,
  FLYOUT_FOOTER_TEST_ID,
} from './constants/test_ids';

export interface FooterProps {
  /**
   * The attack-discovery document hit. Provides `indexName` from
   * `hit.raw._index` for the remote-document gating.
   */
  hit: DataTableRecord;
  /**
   * The parsed attack object from {@link useAttackDetails}. Required by the
   * take-action items and the AI-assistant button.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Callback invoked after a take-action item succeeds; refetches the attack
   * document so the footer's state reflects the mutation.
   */
  refetch: () => Promise<void>;
}

/**
 * Footer of the v2 attack details flyout. Mirrors the legacy `PanelFooter`
 * minus the `<EuiFlyoutFooter>` wrapper (the parent index.tsx provides it).
 */
export const Footer = memo(({ hit, attack, refetch }: FooterProps) => {
  const indexName = hit.raw._index ?? '';
  const isRemoteDocument = useMemo(() => isNonLocalIndexName(indexName), [indexName]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const onActionSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const takeActionButton = useMemo(
    () => (
      <EuiButton
        data-test-subj={FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID}
        fill
        iconSide="right"
        iconType="arrowDown"
        onClick={togglePopover}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.attackDetails.footer.takeActionButtonLabel"
          defaultMessage="Take action"
        />
      </EuiButton>
    ),
    [togglePopover]
  );

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="center"
      data-test-subj={FLYOUT_FOOTER_TEST_ID}
    >
      <EuiFlexItem grow={false}>
        <AttackAiAssistantButton attack={attack} pathway="attacks_page_flyout_take_action" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="AttackDetailsTakeActionPanel"
          button={takeActionButton}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          repositionOnScroll
        >
          <AttacksGroupTakeActionItems
            attack={attack}
            onActionSuccess={onActionSuccess}
            closePopover={closePopover}
            telemetrySource="attacks_page_flyout_take_action"
            showAiAssistantAction={false}
            isRemoteDocument={isRemoteDocument}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

Footer.displayName = 'Footer';
