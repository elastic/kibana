/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AggregatedGapStatus } from '@kbn/alerting-plugin/common';
import { aggregatedGapStatus } from '@kbn/alerting-plugin/common';
import {
  GAP_FILL_STATUS_FILTER_LABEL,
  GAP_FILL_STATUS_FILLED,
  GAP_FILL_STATUS_IN_PROGRESS,
  GAP_FILL_STATUS_UNFILLED,
} from '../../../../common/translations';

interface GapFillStatusSelectorProps {
  selectedStatuses: AggregatedGapStatus[];
  onSelectedStatusesChanged: (newStatuses: AggregatedGapStatus[]) => void;
}

export const GapFillStatusSelector = ({
  selectedStatuses,
  onSelectedStatusesChanged,
}: GapFillStatusSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: GAP_FILL_STATUS_IN_PROGRESS,
        data: { status: aggregatedGapStatus.IN_PROGRESS as AggregatedGapStatus },
        checked: selectedStatuses.includes(aggregatedGapStatus.IN_PROGRESS) ? 'on' : undefined,
      },
      {
        label: GAP_FILL_STATUS_UNFILLED,
        data: { status: aggregatedGapStatus.UNFILLED as AggregatedGapStatus },
        checked: selectedStatuses.includes(aggregatedGapStatus.UNFILLED) ? 'on' : undefined,
      },
      {
        label: GAP_FILL_STATUS_FILLED,
        data: { status: aggregatedGapStatus.FILLED as AggregatedGapStatus },
        checked: selectedStatuses.includes(aggregatedGapStatus.FILLED) ? 'on' : undefined,
      },
    ],
    [selectedStatuses]
  );

  const onChange = (newOptions: EuiSelectableOption[]) => {
    const statuses = newOptions
      .filter((option) => option.checked === 'on')
      .map((option) => (option.data as { status?: AggregatedGapStatus } | undefined)?.status)
      .filter((status): status is AggregatedGapStatus => status != null);
    onSelectedStatusesChanged(statuses);
  };

  const trigger = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsOpen(!isOpen)}
      numFilters={options.length}
      isSelected={isOpen}
      hasActiveFilters={selectedStatuses.length > 0}
      numActiveFilters={selectedStatuses.length}
      data-test-subj="gapFillStatusFilterButton"
    >
      {GAP_FILL_STATUS_FILTER_LABEL}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={trigger}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiSelectable
        aria-label={GAP_FILL_STATUS_FILTER_LABEL}
        options={options}
        onChange={onChange}
        listProps={{ isVirtualized: false }}
        data-test-subj="gapFillStatusFilterSelectableList"
      >
        {(list) => (
          <div
            css={css`
              width: 220px;
            `}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
