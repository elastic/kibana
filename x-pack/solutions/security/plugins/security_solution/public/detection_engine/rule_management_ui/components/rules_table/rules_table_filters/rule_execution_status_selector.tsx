/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import type { RuleExecutionStatus } from '../../../../../../common/api/detection_engine';
import { RuleExecutionStatusEnum } from '../../../../../../common/api/detection_engine';
import { getCapitalizedStatusText } from '../../../../../detections/components/rules/rule_execution_status/utils';
import { RuleStatusBadge } from '../../../../../detections/components/rules/rule_execution_status/rule_status_badge';

interface OptionData {
  status: RuleExecutionStatus;
}

interface RuleExecutionStatusSelectorProps {
  selectedStatus?: RuleExecutionStatus;
  onSelectedStatusChanged: (newStatus?: RuleExecutionStatus) => void;
}

/**
 * Selector for selecting last rule execution status to filter on
 *
 * @param selectedStatus Selected rule execution status
 * @param onSelectedStatusChanged change listener to be notified when rule execution status selection changes
 */
const RuleExecutionStatusSelectorComponent = ({
  selectedStatus,
  onSelectedStatusChanged,
}: RuleExecutionStatusSelectorProps) => {
  const [isExecutionStatusPopoverOpen, setIsExecutionStatusPopoverOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = [
    {
      label: getCapitalizedStatusText(RuleExecutionStatusEnum.succeeded) || '',
      data: { status: RuleExecutionStatusEnum.succeeded },
      checked: selectedStatus === RuleExecutionStatusEnum.succeeded ? 'on' : undefined,
    },
    {
      label: getCapitalizedStatusText(RuleExecutionStatusEnum['partial failure']) || '',
      data: { status: RuleExecutionStatusEnum['partial failure'] },
      checked: selectedStatus === RuleExecutionStatusEnum['partial failure'] ? 'on' : undefined,
    },
    {
      label: getCapitalizedStatusText(RuleExecutionStatusEnum.failed) || '',
      data: { status: RuleExecutionStatusEnum.failed },
      checked: selectedStatus === RuleExecutionStatusEnum.failed ? 'on' : undefined,
    },
  ];

  const handleSelectableOptionsChange = (
    newOptions: EuiSelectableOption[],
    _: unknown,
    changedOption: EuiSelectableOption
  ) => {
    setIsExecutionStatusPopoverOpen(false);

    if (changedOption.checked && changedOption?.data?.status) {
      onSelectedStatusChanged(changedOption.data.status as RuleExecutionStatus);
    } else if (!changedOption.checked) {
      onSelectedStatusChanged();
    }
  };

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => {
        setIsExecutionStatusPopoverOpen(!isExecutionStatusPopoverOpen);
      }}
      numFilters={selectableOptions.length}
      isSelected={isExecutionStatusPopoverOpen}
      hasActiveFilters={selectedStatus !== undefined}
      numActiveFilters={selectedStatus !== undefined ? 1 : 0}
      data-test-subj="executionStatusFilterButton"
    >
      {i18n.COLUMN_LAST_RESPONSE}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isExecutionStatusPopoverOpen}
      closePopover={() => {
        setIsExecutionStatusPopoverOpen(!isExecutionStatusPopoverOpen);
      }}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiSelectable
        aria-label={i18n.RULE_EXECTION_STATUS_FILTER}
        options={selectableOptions}
        onChange={handleSelectableOptionsChange}
        singleSelection
        listProps={{
          isVirtualized: false,
        }}
        renderOption={(option) => {
          const status = (option as EuiSelectableOption<OptionData>).status;
          return (
            <div
              css={`
                margin-top: 4px; // aligns the badge within the option
              `}
              data-test-subj="executionStatusFilterOption"
            >
              <RuleStatusBadge status={status} showTooltip={false} />
            </div>
          );
        }}
        data-test-subj="executionStatusFilterSelectableList"
      >
        {(list) => (
          <div
            css={`
              width: 200px;
            `}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

RuleExecutionStatusSelectorComponent.displayName = 'RuleExecutionStatusSelectorComponent';

export const RuleExecutionStatusSelector = React.memo(RuleExecutionStatusSelectorComponent);

RuleExecutionStatusSelector.displayName = 'RuleExecutionStatusSelector';
