/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { BlockListFlyout } from '../../../block_list/containers/flyout';
import { AddToBlockListContextMenu } from '../../../block_list/components/add_to_block_list';
import { AddToNewCase } from '../../../../../cases/attachments/indicator/components/add_to_new_case';
import { AddToExistingCase } from '../../../../../cases/attachments/indicator/components/add_to_existing_case';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { canAddToBlockList } from '../../../block_list/utils/can_add_to_block_list';
import {
  ADD_TO_BLOCK_LIST_TEST_ID,
  ADD_TO_EXISTING_TEST_ID,
  ADD_TO_NEW_CASE_TEST_ID,
  MORE_ACTIONS_TEST_ID,
} from './test_ids';
import { MORE_ACTIONS_BUTTON_LABEL } from './translations';

export interface TakeActionProps {
  /**
   * Indicator object
   */
  indicator: Indicator;
}

/**
 * Component rendered in the action column.
 * Renders a ... icon button, with a dropdown.
 */
export const MoreActions = memo(({ indicator }: TakeActionProps) => {
  const [blockListIndicatorValue, setBlockListIndicatorValue] = useState('');

  const [isPopoverOpen, setPopover] = useState(false);
  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const items = useMemo(
    () => [
      <AddToExistingCase
        key={'attachmentsExistingCase'}
        indicator={indicator}
        onClick={closePopover}
        data-test-subj={ADD_TO_EXISTING_TEST_ID}
      />,
      <AddToNewCase
        key={'attachmentsNewCase'}
        indicator={indicator}
        onClick={closePopover}
        data-test-subj={ADD_TO_NEW_CASE_TEST_ID}
      />,
      <AddToBlockListContextMenu
        key={'addToBlocklist'}
        data={canAddToBlockList(indicator)}
        onClick={closePopover}
        data-test-subj={ADD_TO_BLOCK_LIST_TEST_ID}
        setBlockListIndicatorValue={setBlockListIndicatorValue}
      />,
    ],
    [closePopover, indicator]
  );

  const button = useMemo(
    () => (
      <EuiToolTip content={MORE_ACTIONS_BUTTON_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          aria-label={MORE_ACTIONS_BUTTON_LABEL}
          color="text"
          data-test-subj={MORE_ACTIONS_TEST_ID}
          iconType="boxesHorizontal"
          onClick={() => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen)}
          size="s"
        />
      </EuiToolTip>
    ),
    []
  );

  return (
    <>
      <EuiPopover
        id={smallContextMenuPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>

      {blockListIndicatorValue && (
        <BlockListFlyout
          indicatorFileHash={blockListIndicatorValue}
          setBlockListIndicatorValue={setBlockListIndicatorValue}
        />
      )}
    </>
  );
});

MoreActions.displayName = 'MoreActions';
