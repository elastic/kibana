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
  GAP_STATUS_FILTER_LABEL,
  GAP_STATUS_FILLED,
  GAP_STATUS_IN_PROGRESS,
  GAP_STATUS_UNFILLED,
} from '../../../../common/translations';

interface GapStatusSelectorProps {
  selectedStatus?: AggregatedGapStatus;
  onSelectedStatusChanged: (newStatus?: AggregatedGapStatus) => void;
}

export const GapStatusSelector = ({
  selectedStatus,
  onSelectedStatusChanged,
}: GapStatusSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: GAP_STATUS_IN_PROGRESS,
        data: { status: aggregatedGapStatus.IN_PROGRESS as AggregatedGapStatus },
        checked: selectedStatus === aggregatedGapStatus.IN_PROGRESS ? 'on' : undefined,
      },
      {
        label: GAP_STATUS_UNFILLED,
        data: { status: aggregatedGapStatus.UNFILLED as AggregatedGapStatus },
        checked: selectedStatus === aggregatedGapStatus.UNFILLED ? 'on' : undefined,
      },
      {
        label: GAP_STATUS_FILLED,
        data: { status: aggregatedGapStatus.FILLED as AggregatedGapStatus },
        checked: selectedStatus === aggregatedGapStatus.FILLED ? 'on' : undefined,
      },
    ],
    [selectedStatus]
  );

  const onChange = (
    newOptions: EuiSelectableOption[],
    _: unknown,
    changed: EuiSelectableOption
  ) => {
    setIsOpen(false);
    const status = (changed?.data as { status?: AggregatedGapStatus } | undefined)?.status;
    if (changed.checked && status) {
      onSelectedStatusChanged(status);
    } else if (!changed.checked) {
      onSelectedStatusChanged(undefined);
    }
  };

  const trigger = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsOpen(!isOpen)}
      numFilters={options.length}
      isSelected={isOpen}
      hasActiveFilters={selectedStatus !== undefined}
      numActiveFilters={selectedStatus !== undefined ? 1 : 0}
      data-test-subj="gapStatusFilterButton"
    >
      {GAP_STATUS_FILTER_LABEL}
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
        aria-label={GAP_STATUS_FILTER_LABEL}
        options={options}
        onChange={onChange}
        singleSelection
        listProps={{ isVirtualized: false }}
        data-test-subj="gapStatusFilterSelectableList"
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
