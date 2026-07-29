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
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { AttacksGroupTakeActionItems } from '../../../detections/components/attacks/table/attacks_group_take_action_items';
import { AttackAiAssistantButton } from '../../../detections/components/attacks/table/attack_details/attack_ai_assistant_button';
import { FOOTER_TEST_ID, FOOTER_TAKE_ACTION_BUTTON_TEST_ID } from './constants/test_ids';

export interface FooterProps {
  /**
   * The attack discovery alert object.
   */
  attack: AttackDiscoveryAlert;
  /**
   * The raw ES document hit for the attack.
   */
  hit: DataTableRecord;
  /**
   * Callback invoked after attack mutations to refresh related views.
   */
  onAttackUpdated: () => void;
}

/**
 * Footer for the v2 attack flyout. Renders the AI assistant button and the Take action popover.
 * The take action menu includes either "Investigate in Timeline" or "Explore in Attacks" depending
 * on the active app, swapped automatically by the underlying menu items.
 * Prop-driven — no context dependencies.
 */
export const Footer = memo(({ attack, hit, onAttackUpdated }: FooterProps) => {
  const indexName = hit.raw._index ?? (getFieldValue(hit, '_index') as string | undefined);
  const isRemoteDocument = useMemo(() => isNonLocalIndexName(indexName ?? ''), [indexName]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const onActionSuccess = useCallback(() => {
    onAttackUpdated();
  }, [onAttackUpdated]);

  const takeActionButton = useMemo(
    () => (
      <EuiButton
        data-test-subj={FOOTER_TAKE_ACTION_BUTTON_TEST_ID}
        fill
        iconSide="right"
        iconType="arrowDown"
        onClick={togglePopover}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyoutV2.attack.footer.takeActionButtonLabel"
          defaultMessage="Take action"
        />
      </EuiButton>
    ),
    [togglePopover]
  );

  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center" data-test-subj={FOOTER_TEST_ID}>
      <EuiFlexItem grow={false}>
        <AttackAiAssistantButton attack={attack} pathway="attacks_page_flyout_take_action" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="AttackFlyoutV2TakeActionPanel"
          aria-label={i18n.translate(
            'xpack.securitySolution.flyoutV2.attack.footer.takeActionPopoverAriaLabel',
            { defaultMessage: 'Take action' }
          )}
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
