/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiSwitch,
  EuiFormRow,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from './translations';
import { TABLE_SECTION_TEST_ID } from './table_section';

export interface AttacksViewOptionsPopoverProps {
  showAnonymized: boolean;
  onToggleShowAnonymized: () => void;
  showAttacksOnly: boolean;
  onToggleShowAttacksOnly: () => void;
}

export const AttacksViewOptionsPopover: React.FC<AttacksViewOptionsPopoverProps> = ({
  showAnonymized,
  onToggleShowAnonymized,
  showAttacksOnly,
  onToggleShowAttacksOnly,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const button = (
    <EuiButtonIcon
      iconType="controls"
      aria-label={i18n.VIEW_OPTIONS_ARIA_LABEL}
      onClick={onButtonClick}
      data-test-subj={`${TABLE_SECTION_TEST_ID}-view-options-button`}
    />
  );

  return (
    <EuiPopover
      id="attacksViewOptionsPopover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="m"
      anchorPosition="downRight"
      panelStyle={{ minWidth: euiTheme.base * 18 }}
    >
      <EuiFormRow display="rowCompressed">
        <EuiSwitch
          label={i18n.SHOW_ANONYMIZED_LABEL}
          checked={showAnonymized}
          onChange={onToggleShowAnonymized}
          data-test-subj={`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`}
          compressed
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow display="rowCompressed">
        <EuiSwitch
          label={i18n.SHOW_ATTACKS_ONLY_LABEL}
          checked={showAttacksOnly}
          onChange={onToggleShowAttacksOnly}
          data-test-subj={`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`}
          compressed
        />
      </EuiFormRow>
    </EuiPopover>
  );
};
