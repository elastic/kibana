/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, VFC } from 'react';
import {
  EuiButtonIcon,
  EuiComboBoxOptionOption,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import moment from 'moment';
import { CopyToClipboardContextMenu } from '../common/copy_to_clipboard';
import { FilterInContextMenu } from '../../../query_bar/components/filter_in';
import { FilterOutContextMenu } from '../../../query_bar/components/filter_out';
import { AddToTimelineContextMenu } from '../../../timeline/components/add_to_timeline';
import {
  COPY_TO_CLIPBOARD_BUTTON_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID,
} from './test_ids';
import { BUTTON_LABEL } from './translations';

export interface IndicatorBarchartLegendActionProps {
  /**
   * Indicator
   */
  data: string;
  /**
   * Indicator field selected in the IndicatorFieldSelector component, passed to the {@link AddToTimelineContextMenu} to populate the timeline.
   */
  field: EuiComboBoxOptionOption<string>;
}

export const IndicatorBarchartLegendAction: VFC<IndicatorBarchartLegendActionProps> = ({
  data,
  field,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const group = field.value === 'date' ? moment(data).toISOString() : data;
  const popoverItems = [
    <FilterInContextMenu
      key={FILTER_IN_BUTTON_TEST_ID}
      data={group}
      field={field.label}
      data-test-subj={FILTER_IN_BUTTON_TEST_ID}
    />,
    <FilterOutContextMenu
      key={FILTER_OUT_BUTTON_TEST_ID}
      data={group}
      field={field.label}
      data-test-subj={FILTER_OUT_BUTTON_TEST_ID}
    />,
    <AddToTimelineContextMenu
      key={TIMELINE_BUTTON_TEST_ID}
      data={group}
      field={field.label}
      data-test-subj={TIMELINE_BUTTON_TEST_ID}
    />,
    <CopyToClipboardContextMenu
      key={COPY_TO_CLIPBOARD_BUTTON_TEST_ID}
      value={group}
      data-test-subj={COPY_TO_CLIPBOARD_BUTTON_TEST_ID}
    />,
  ];

  return (
    <EuiPopover
      data-test-subj={POPOVER_BUTTON_TEST_ID}
      button={
        <EuiToolTip content={BUTTON_LABEL}>
          <EuiButtonIcon
            aria-label={BUTTON_LABEL}
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
  );
};
