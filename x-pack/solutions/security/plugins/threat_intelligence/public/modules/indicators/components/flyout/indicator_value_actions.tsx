/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, VFC } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { useIndicatorsFlyoutContext } from '../../hooks/use_flyout_context';
import { Indicator } from '../../../../../common/types/indicator';
import { FilterInButtonIcon } from '../../../query_bar/components/filter_in';
import { FilterOutButtonIcon } from '../../../query_bar/components/filter_out';
import {
  AddToTimelineButtonIcon,
  AddToTimelineContextMenu,
} from '../../../timeline/components/add_to_timeline';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../utils/field_value';
import { CopyToClipboardButtonIcon, CopyToClipboardContextMenu } from '../common/copy_to_clipboard';
import {
  COPY_TO_CLIPBOARD_BUTTON_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID,
} from './test_ids';
import { MORE_ACTIONS_BUTTON_LABEL } from './translations';

interface IndicatorValueActions {
  /**
   * Indicator complete object.
   */
  indicator: Indicator;
  /**
   * Indicator field used for the filter in/out and add to timeline feature.
   */
  field: string;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * This component render a set of actions for the user.
 * Currently used in the indicators flyout (overview and table tabs).
 *
 * It gets a readOnly boolean from context, that drives what is displayed.
 * - in the cases view usage, we only display add to timeline and copy to clipboard.
 * - in the indicators table usave, we display all options
 */
export const IndicatorValueActions: VFC<IndicatorValueActions> = ({
  indicator,
  field,
  'data-test-subj': dataTestSubj,
}) => {
  const { kqlBarIntegration } = useIndicatorsFlyoutContext();

  const [isPopoverOpen, setPopover] = useState(false);

  const { key, value } = getIndicatorFieldAndValue(indicator, field);
  if (!fieldAndValueValid(key, value)) {
    return null;
  }

  const filterInTestId = `${dataTestSubj}${FILTER_IN_BUTTON_TEST_ID}`;
  const filterOutTestId = `${dataTestSubj}${FILTER_OUT_BUTTON_TEST_ID}`;
  const timelineTestId = `${dataTestSubj}${TIMELINE_BUTTON_TEST_ID}`;
  const copyToClipboardTestId = `${dataTestSubj}${COPY_TO_CLIPBOARD_BUTTON_TEST_ID}`;
  const popoverTestId = `${dataTestSubj}${POPOVER_BUTTON_TEST_ID}`;

  if (kqlBarIntegration) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="none">
        <AddToTimelineButtonIcon data={indicator} field={field} data-test-subj={timelineTestId} />
        <CopyToClipboardButtonIcon value={value as string} data-test-subj={copyToClipboardTestId} />
      </EuiFlexGroup>
    );
  }

  const popoverItems = [
    <AddToTimelineContextMenu data={indicator} field={field} data-test-subj={timelineTestId} />,
    <CopyToClipboardContextMenu value={value as string} data-test-subj={copyToClipboardTestId} />,
  ];

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="none">
      <FilterInButtonIcon data={indicator} field={field} data-test-subj={filterInTestId} />
      <FilterOutButtonIcon data={indicator} field={field} data-test-subj={filterOutTestId} />
      <EuiPopover
        data-test-subj={popoverTestId}
        button={
          <EuiToolTip content={MORE_ACTIONS_BUTTON_LABEL}>
            <EuiButtonIcon
              aria-label={MORE_ACTIONS_BUTTON_LABEL}
              iconType="boxesHorizontal"
              iconSize="s"
              size="xs"
              onClick={() => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen)}
              style={{ height: '100%' }}
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setPopover(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={popoverItems} />
      </EuiPopover>
    </EuiFlexGroup>
  );
};
