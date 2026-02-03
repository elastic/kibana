/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IOCRightPanelKey } from '../../../../../flyout/ioc_details/constants/panel_keys';
import { BUTTON_TEST_ID } from './test_ids';
import { VIEW_DETAILS_BUTTON_LABEL } from './translations';

export interface OpenIndicatorFlyoutButtonProps {
  /**
   * {@link Indicator} passed to the flyout component.
   */
  indicator: Indicator;
}

/**
 * Button added to the actions column of the indicators table to open/close the IndicatorFlyout component.
 */
export const OpenIndicatorFlyoutButton = memo(({ indicator }: OpenIndicatorFlyoutButtonProps) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const open = useCallback(
    () =>
      openFlyout({
        right: {
          id: IOCRightPanelKey,
          params: {
            id: indicator._id,
          },
        },
      }),
    [indicator._id, openFlyout]
  );

  return (
    <EuiToolTip content={VIEW_DETAILS_BUTTON_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={VIEW_DETAILS_BUTTON_LABEL}
        data-test-subj={BUTTON_TEST_ID}
        color="text"
        iconType="expand"
        onClick={open}
        size="s"
      />
    </EuiToolTip>
  );
});

OpenIndicatorFlyoutButton.displayName = 'OpenIndicatorFlyoutButton';
