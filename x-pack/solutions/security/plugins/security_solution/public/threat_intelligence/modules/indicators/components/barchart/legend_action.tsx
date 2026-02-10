/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover, EuiToolTip } from '@elastic/eui';
import { getStore } from '../../../../../common/store';
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
import { timestampToIsoString } from './utils';

export interface IndicatorBarchartLegendActionProps {
  /**
   * Indicator
   */
  data: string;
  /**
   * Indicator field selected in the IndicatorFieldSelector component, passed to the {@link AddToTimelineContextMenu} to populate the timeline.
   */
  field: EuiComboBoxOptionOption<string>;
  announceIndicatorActionChange: (filterMessage: string) => void;
}

export const IndicatorBarchartLegendAction: FC<IndicatorBarchartLegendActionProps> = ({
  data,
  field,
  announceIndicatorActionChange,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const group = field.value === 'date' ? timestampToIsoString(data) : data;

  const popoverItems = [
    <FilterInContextMenu
      key={FILTER_IN_BUTTON_TEST_ID}
      data={group}
      field={field.label}
      onAnnounce={announceIndicatorActionChange}
      data-test-subj={FILTER_IN_BUTTON_TEST_ID}
    />,
    <FilterOutContextMenu
      key={FILTER_OUT_BUTTON_TEST_ID}
      data={group}
      field={field.label}
      onAnnounce={announceIndicatorActionChange}
      data-test-subj={FILTER_OUT_BUTTON_TEST_ID}
    />,
    <AddToTimelineContextMenu
      key={TIMELINE_BUTTON_TEST_ID}
      data={group}
      field={field.label}
      onAnnounce={announceIndicatorActionChange}
      showPopover={setPopover}
      data-test-subj={TIMELINE_BUTTON_TEST_ID}
    />,
    <CopyToClipboardContextMenu
      key={COPY_TO_CLIPBOARD_BUTTON_TEST_ID}
      value={group}
      data-test-subj={COPY_TO_CLIPBOARD_BUTTON_TEST_ID}
    />,
  ];

  const store = getStore();

  if (!store) {
    return null;
  }

  return (
    <EuiPopover
      data-test-subj={POPOVER_BUTTON_TEST_ID}
      button={
        <EuiToolTip content={BUTTON_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={BUTTON_LABEL}
            iconType="boxesHorizontal"
            iconSize="s"
            size="xs"
            onClick={() => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen)}
            css={{ height: '100%' }}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setPopover(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <ReduxProvider store={store}>
        <EuiContextMenuPanel size="s" items={popoverItems} />
      </ReduxProvider>
    </EuiPopover>
  );
};
