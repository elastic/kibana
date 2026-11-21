/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiScreenReaderOnly,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { MonitorSearchableList } from './monitor_searchable_list';

export const MonitorSelector = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const { monitor } = useSelectedMonitor();

  return (
    <>
      <EuiScreenReaderOnly>
        <h1>{monitor?.name}</h1>
      </EuiScreenReaderOnly>
      <EuiPopover
        id="monitorSelector"
        panelPaddingSize="none"
        button={
          <EuiButtonEmpty
            data-test-subj="syntheticsMonitorSelectorButton"
            aria-label={SELECT_MONITOR}
            color="text"
            iconType="chevronSingleDown"
            iconSide="right"
            size="s"
            css={css`
              block-size: ${euiTheme.size.xl};
              max-inline-size: 48ch;
              font-weight: ${euiTheme.font.weight.bold};
              font-size: 1.25rem;
              line-height: ${euiTheme.base};
            `}
            onClick={() => setIsPopoverOpen((open) => !open)}
          >
            {monitor?.name}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        aria-labelledby={popoverTitleId}
        // The header badge is a column flex item, so the anchor would otherwise
        // stretch across the title row and the panel would open mid-page.
        css={{ alignSelf: 'flex-start' }}
      >
        <EuiScreenReaderOnly>
          <span id={popoverTitleId}>{SELECT_MONITOR}</span>
        </EuiScreenReaderOnly>
        <MonitorSearchableList closePopover={() => setIsPopoverOpen(false)} />
      </EuiPopover>
    </>
  );
};

const SELECT_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.selectMonitor', {
  defaultMessage: 'Select a different monitor to view its details',
});
