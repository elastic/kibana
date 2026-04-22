/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { isCCSRemoteIndexName } from '@kbn/es-query';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AttacksGroupTakeActionItems } from '../../detections/components/attacks/table/attacks_group_take_action_items';
import { AttackAiAssistantButton } from '../../detections/components/attacks/table/attack_details/attack_ai_assistant_button';
import {
  FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID,
  FLYOUT_FOOTER_TEST_ID,
} from './constants/test_ids';
import { useAttackDetailsContext } from './context';

export { FLYOUT_FOOTER_TEST_ID };

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter = () => {
  const { attack, indexName, refetch } = useAttackDetailsContext();
  const isRemoteDocument = useMemo(() => isCCSRemoteIndexName(indexName), [indexName]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const onActionSuccess = useCallback(() => {
    /* Update the attack details context after an action is taken */
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

  if (!attack) return null;

  return (
    <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
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
                size="s"
                telemetrySource="attacks_page_flyout_take_action"
                showAiAssistantAction={false}
                isRemoteDocument={isRemoteDocument}
              />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};

PanelFooter.displayName = 'PanelFooter';
