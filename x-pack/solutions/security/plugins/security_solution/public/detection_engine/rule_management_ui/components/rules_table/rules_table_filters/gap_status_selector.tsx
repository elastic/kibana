/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AggregatedGapStatus } from '@kbn/alerting-plugin/common';
import { aggregatedGapStatus } from '@kbn/alerting-plugin/common';

interface GapStatusSelectorProps {
  selectedStatus?: AggregatedGapStatus;
  onSelectedStatusChanged: (newStatus?: GapStatus) => void;
}

export const GapStatusSelector = ({
  selectedStatus,
  onSelectedStatusChanged,
}: GapStatusSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const options: EuiSelectableOption[] = [
    {
      label: i18n.translate(
        'xpack.securitySolution.detectionEngine.rules.filters.gapStatus.inProgress',
        { defaultMessage: 'In progress' }
      ),
      data: { status: aggregatedGapStatus.IN_PROGRESS as AggregatedGapStatus },
      checked: selectedStatus === aggregatedGapStatus.IN_PROGRESS ? 'on' : undefined,
    },
    {
      label: i18n.translate(
        'xpack.securitySolution.detectionEngine.rules.filters.gapStatus.unfilled',
        { defaultMessage: 'Unfilled' }
      ),
      data: { status: aggregatedGapStatus.UNFILLED as AggregatedGapStatus },
      checked: selectedStatus === aggregatedGapStatus.UNFILLED ? 'on' : undefined,
    },
    {
      label: i18n.translate(
        'xpack.securitySolution.detectionEngine.rules.filters.gapStatus.filled',
        { defaultMessage: 'Filled' }
      ),
      data: { status: aggregatedGapStatus.FILLED as AggregatedGapStatus },
      checked: selectedStatus === aggregatedGapStatus.FILLED ? 'on' : undefined,
    },
  ];

  const onChange = (
    newOptions: EuiSelectableOption[],
    _: unknown,
    changed: EuiSelectableOption
  ) => {
    setIsOpen(false);
    const status = (changed?.data as { status?: AggregatedGapStatus } | undefined)?.status as
      | AggregatedGapStatus
      | undefined;
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
      {i18n.translate('xpack.securitySolution.detectionEngine.rules.filters.gapStatus.label', {
        defaultMessage: 'Gap status',
      })}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={trigger}
      isOpen={isOpen}
      closePopover={() => setIsOpen(!isOpen)}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiSelectable
        aria-label={i18n.translate(
          'xpack.securitySolution.detectionEngine.rules.filters.gapStatus.label',
          {
            defaultMessage: 'Gap status',
          }
        )}
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
