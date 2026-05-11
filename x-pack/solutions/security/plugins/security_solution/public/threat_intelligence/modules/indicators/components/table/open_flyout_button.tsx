/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import type { DataTableRecord } from '@kbn/discover-utils';
import { formatFlyoutTitle } from '../../../../../flyout_v2/document/utils/get_header_title';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { RawIndicatorFieldId } from '../../../../../../common/threat_intelligence/types/indicator';
import { IOCRightPanelKey } from '../../../../../flyout/ioc_details/constants/panel_keys';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../../common/lib/kibana';
import { flyoutProviders } from '../../../../../flyout_v2/shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { IOCDetails } from '../../../../../flyout_v2/ioc';
import { IOC_FLYOUT_TITLE } from '../../../../../flyout_v2/shared/constants/flyout_titles';
import { cellActionRenderer } from '../../../../../flyout_v2/shared/components/cell_actions';
import { documentFlyoutHistoryKey } from '../../../../../flyout_v2/shared/constants/flyout_history';
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

  const hit = useMemo<DataTableRecord>(
    () => ({
      id: indicator._id as string,
      raw: { _id: indicator._id as string, fields: indicator.fields },
      flattened: indicator.fields as Record<string, unknown>,
    }),
    [indicator]
  );

  const indicatorName = useMemo(() => {
    const nameField = indicator.fields[RawIndicatorFieldId.Name];
    if (Array.isArray(nameField) && nameField.length > 0) {
      return String(nameField[0]);
    }
    return undefined;
  }, [indicator.fields]);

  const open = useCallback(() => {
    if (newFlyoutSystemEnabled) {
      const iocTitle = formatFlyoutTitle(IOC_FLYOUT_TITLE, indicatorName);
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <IOCDetails hit={hit} renderCellActions={cellActionRenderer} />,
        }),
        {
          ...defaultFlyoutProperties,
          historyKey: documentFlyoutHistoryKey,
          session: 'start',
          title: iocTitle,
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
    hit,
    indicator._id,
    defaultFlyoutProperties,
    openFlyout,
    indicatorName,
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
