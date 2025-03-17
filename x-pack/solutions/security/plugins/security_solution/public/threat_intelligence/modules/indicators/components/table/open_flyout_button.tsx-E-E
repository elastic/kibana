/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { Indicator } from '../../../../../common/types/indicator';
import { BUTTON_TEST_ID } from './test_ids';
import { VIEW_DETAILS_BUTTON_LABEL } from './translations';

export interface OpenIndicatorFlyoutButtonProps {
  /**
   * {@link Indicator} passed to the flyout component.
   */
  indicator: Indicator;
  /**
   * Method called by the onClick event to open/close the flyout.
   */
  onOpen: (indicator: Indicator) => void;
  /**
   * Boolean used to change the color and type of icon depending on the state of the flyout.
   */
  isOpen: boolean;
}

/**
 * Button added to the actions column of the indicators table to open/close the IndicatorFlyout component.
 */
export const OpenIndicatorFlyoutButton: VFC<OpenIndicatorFlyoutButtonProps> = ({
  indicator,
  onOpen,
  isOpen,
}) => {
  return (
    <EuiToolTip content={VIEW_DETAILS_BUTTON_LABEL}>
      <EuiButtonIcon
        data-test-subj={BUTTON_TEST_ID}
        color={isOpen ? 'text' : 'primary'}
        iconType={isOpen ? 'minimize' : 'expand'}
        isSelected={isOpen}
        iconSize="s"
        aria-label={VIEW_DETAILS_BUTTON_LABEL}
        onClick={() => onOpen(indicator)}
      />
    </EuiToolTip>
  );
};
