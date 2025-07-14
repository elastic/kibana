/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { RuleCustomizationStatus } from '../../../../../../common/api/detection_engine';
import * as i18n from '../../../../common/translations';

interface RuleCustomizationFilterPopoverProps {
  customizationStatus: RuleCustomizationStatus | undefined;
  onCustomizationStatusChanged: (newRuleSource: RuleCustomizationStatus | undefined) => void;
}

const RULE_CUSTOMIZATION_POPOVER_WIDTH = 200;

const RuleCustomizationFilterPopoverComponent = ({
  customizationStatus,
  onCustomizationStatusChanged,
}: RuleCustomizationFilterPopoverProps) => {
  const [isRuleCustomizationPopoverOpen, setIsRuleCustomizationPopoverOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.MODIFIED_LABEL,
        key: RuleCustomizationStatus.CUSTOMIZED,
        checked: customizationStatus === RuleCustomizationStatus.CUSTOMIZED ? 'on' : undefined,
      },
      {
        label: i18n.UNMODIFIED_LABEL,
        key: RuleCustomizationStatus.NOT_CUSTOMIZED,
        checked: customizationStatus === RuleCustomizationStatus.NOT_CUSTOMIZED ? 'on' : undefined,
      },
    ],
    [customizationStatus]
  );

  const handleSelectableOptionsChange = (
    newOptions: EuiSelectableOption[],
    _: unknown,
    changedOption: EuiSelectableOption
  ) => {
    onCustomizationStatusChanged(
      changedOption.checked === 'on' ? (changedOption.key as RuleCustomizationStatus) : undefined
    );
  };

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsRuleCustomizationPopoverOpen(!isRuleCustomizationPopoverOpen)}
      numFilters={selectableOptions.length}
      isSelected={isRuleCustomizationPopoverOpen}
      hasActiveFilters={customizationStatus != null}
      numActiveFilters={customizationStatus != null ? 1 : 0}
      data-test-subj="rule-customization-filter-popover-button"
    >
      {i18n.RULE_SOURCE}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isRuleCustomizationPopoverOpen}
      closePopover={() => setIsRuleCustomizationPopoverOpen(!isRuleCustomizationPopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'rule-customization-filter-popover',
      }}
    >
      <EuiSelectable options={selectableOptions} onChange={handleSelectableOptionsChange}>
        {(list) => <div css={{ width: RULE_CUSTOMIZATION_POPOVER_WIDTH }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const RuleCustomizationFilterPopover = React.memo(RuleCustomizationFilterPopoverComponent);
