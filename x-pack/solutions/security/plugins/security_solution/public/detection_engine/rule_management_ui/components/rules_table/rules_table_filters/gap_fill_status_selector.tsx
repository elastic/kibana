/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';
import type { GapFillStatus } from '@kbn/alerting-plugin/common';
import { gapFillStatus } from '@kbn/alerting-plugin/common';
import { useBoolean } from '@kbn/react-hooks';
import {
  GAP_FILL_STATUS_FILTER_LABEL,
  GAP_FILL_STATUS_FILLED,
  GAP_FILL_STATUS_IN_PROGRESS,
  GAP_FILL_STATUS_UNFILLED,
} from '../../../../common/translations';

interface GapFillStatusSelectorProps {
  selectedStatuses: GapFillStatus[];
  onSelectedStatusesChanged: (newStatuses: GapFillStatus[]) => void;
}

export const GapFillStatusSelector = ({
  selectedStatuses,
  onSelectedStatusesChanged,
}: GapFillStatusSelectorProps) => {
  const [isOpen, { off: close, toggle }] = useBoolean(false);

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: GAP_FILL_STATUS_IN_PROGRESS,
        data: { status: gapFillStatus.IN_PROGRESS as GapFillStatus },
        checked: selectedStatuses.includes(gapFillStatus.IN_PROGRESS) ? 'on' : undefined,
      },
      {
        label: GAP_FILL_STATUS_UNFILLED,
        data: { status: gapFillStatus.UNFILLED as GapFillStatus },
        checked: selectedStatuses.includes(gapFillStatus.UNFILLED) ? 'on' : undefined,
      },
      {
        label: GAP_FILL_STATUS_FILLED,
        data: { status: gapFillStatus.FILLED as GapFillStatus },
        checked: selectedStatuses.includes(gapFillStatus.FILLED) ? 'on' : undefined,
      },
    ],
    [selectedStatuses]
  );

  const onChange = (newOptions: EuiSelectableOption[]) => {
    const statuses = newOptions
      .filter((option) => option.checked === 'on')
      .map((option) => (option.data as { status?: GapFillStatus } | undefined)?.status)
      .filter((status): status is GapFillStatus => status != null);
    onSelectedStatusesChanged(statuses);
  };

  const trigger = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={toggle}
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
      closePopover={close}
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
