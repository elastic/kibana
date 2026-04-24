/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IOCRightPanelKey } from '../../../../../flyout/ioc_details/constants/panel_keys';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../../common/lib/kibana';
import { flyoutProviders } from '../../../../../flyout_v2/shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { IOCDetails } from '../../../../../flyout_v2/ioc_details';
import { iocFlyoutHistoryKey } from '../../../../../flyout_v2/ioc_details/constants/flyout_history';
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
  const newFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const open = useCallback(() => {
    if (newFlyoutSystemEnabled) {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <IOCDetails id={indicator._id} />,
        }),
        {
          ...defaultFlyoutProperties,
          historyKey: iocFlyoutHistoryKey,
          session: 'start',
        }
      );
    } else {
      openFlyout({
        right: {
          id: IOCRightPanelKey,
          params: {
            id: indicator._id,
          },
        },
      });
    }
  }, [
    newFlyoutSystemEnabled,
    overlays,
    services,
    store,
    history,
    indicator._id,
    defaultFlyoutProperties,
    openFlyout,
  ]);

  return (
    <EuiToolTip content={VIEW_DETAILS_BUTTON_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={VIEW_DETAILS_BUTTON_LABEL}
        data-test-subj={BUTTON_TEST_ID}
        color="text"
        iconType="maximize"
        onClick={open}
        size="s"
      />
    </EuiToolTip>
  );
});

OpenIndicatorFlyoutButton.displayName = 'OpenIndicatorFlyoutButton';
