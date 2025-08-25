/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiProgress,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DetailedFlyoutHeader } from './monitor_details_flyout/details_flyout_header';
import { DetailFlyoutDurationChart } from './monitor_details_flyout/details_flyout_duration_chart';
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import { useMonitorDetail } from '../../../../hooks/use_monitor_detail';
import { useMonitorDetailLocator } from '../../../../hooks/use_monitor_detail_locator';
import {
  getMonitorAction,
  selectMonitorUpsertStatus,
  selectOverviewState,
  selectSyntheticsMonitor,
  selectSyntheticsMonitorError,
  selectSyntheticsMonitorLoading,
  setFlyoutConfig,
} from '../../../../state';
import { MonitorDetailsPanel } from '../../../common/components/monitor_details_panel';
import { ErrorCallout } from '../../../common/components/error_callout';
import { useOverviewStatus } from '../../hooks/use_overview_status';
import type { OverviewStatusMetaData } from '../types';
import { ConfigKey } from '../types';
import { ActionsPopover } from './actions_popover';
import { quietFetchOverviewStatusAction } from '../../../../state/overview_status';

export interface MonitorDetailsFlyoutProps {
  overviewItem: OverviewStatusMetaData;
  onClose: () => void;
  onEnabledChange: () => void;
  onLocationChange: (params: OverviewStatusMetaData) => void;
  currentDurationChartFrom?: string;
  currentDurationChartTo?: string;
  previousDurationChartFrom?: string;
  previousDurationChartTo?: string;
}

export function LoadingState() {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" css={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function MonitorDetailFlyout(props: MonitorDetailsFlyoutProps) {
  const { onLocationChange, overviewItem } = props;

  const { configId, locationId, spaces } = overviewItem;
  const { allConfigs } = useOverviewStatus({ scopeStatusByLocation: true });

  const setLocation = useCallback(
    (locationIdNew: string) => {
      const locOverview = allConfigs.find(
        (cfg) => cfg.configId === configId && cfg.locationId === locationIdNew
      )!;
      onLocationChange(locOverview);
    },
    [allConfigs, onLocationChange, configId]
  );

  const detailLink = useMonitorDetailLocator({
    configId,
    locationId,
    spaces,
  });

  const dispatch = useDispatch();

  useEffect(() => {
    return () => {
      dispatch(setFlyoutConfig(null));
    };
  }, [dispatch]);

  const upsertStatus = useSelector(selectMonitorUpsertStatus(configId));
  const monitorObject = useSelector(selectSyntheticsMonitor);
  const isLoading = useSelector(selectSyntheticsMonitorLoading);
  const error = useSelector(selectSyntheticsMonitorError);

  const upsertSuccess = upsertStatus?.status === 'success';

  const { space } = useKibanaSpace();

  useEffect(() => {
    dispatch(
      getMonitorAction.get({
        monitorId: configId,
        ...(space && spaces?.length && !spaces?.includes(space?.id) ? { spaceId: spaces[0] } : {}),
      })
    );
  }, [configId, dispatch, space, space?.id, spaces, upsertSuccess]);

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const monitorDetail = useMonitorDetail(configId, locationId);

  const isOverlay = useIsWithinMaxBreakpoint('xl');

  return (
    <EuiFlyout
      size="600px"
      type={isOverlay ? 'overlay' : 'push'}
      onClose={props.onClose}
      paddingSize="none"
      aria-label={i18n.translate('xpack.synthetics.monitorList.monitorDetailFlyoutAriaLabel', {
        defaultMessage: 'Monitor details flyout for {monitorName}',
        values: { monitorName: overviewItem.name ?? monitorObject?.[ConfigKey.NAME] },
      })}
    >
      {error && !isLoading && <ErrorCallout {...error} />}
      <EuiFlyoutHeader hasBorder>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <EuiFlexGroup responsive={false} gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{overviewItem.name ?? monitorObject?.[ConfigKey.NAME]}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {overviewItem && (
                <ActionsPopover
                  isPopoverOpen={isActionsPopoverOpen}
                  isInspectView
                  monitor={overviewItem}
                  setIsPopoverOpen={setIsActionsPopoverOpen}
                  position="default"
                  iconHasPanel={false}
                  iconSize="xs"
                  locationId={locationId}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <DetailedFlyoutHeader
            overviewItem={overviewItem}
            currentLocationId={locationId}
            setCurrentLocation={setLocation}
            configId={configId}
            monitor={monitorObject}
            onEnabledChange={props.onEnabledChange}
          />
        </EuiPanel>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DetailFlyoutDurationChart {...props} />
        {isLoading && monitorObject && <EuiProgress size="xs" color="accent" />}
        {monitorObject ? (
          <>
            <MonitorDetailsPanel
              hasBorder={false}
              hideEnabled
              latestPing={monitorDetail.data}
              configId={configId}
              monitor={{
                ...monitorObject,
                id: configId,
              }}
              loading={Boolean(isLoading)}
            />
          </>
        ) : (
          <LoadingState />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="transparent">
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="syntheticsMonitorDetailFlyoutButton"
                onClick={props.onClose}
              >
                {CLOSE_FLYOUT_TEXT}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="syntheticsMonitorDetailFlyoutButton"
                // `detailLink` can be undefined, in this case, disable the button
                isDisabled={!detailLink}
                href={detailLink}
                iconType="sortRight"
                iconSide="right"
                fill
              >
                {GO_TO_MONITOR_LINK_TEXT}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

export const MaybeMonitorDetailsFlyout = ({
  setFlyoutConfigCallback,
}: {
  setFlyoutConfigCallback: (params: OverviewStatusMetaData) => void;
}) => {
  const dispatch = useDispatch();

  const { flyoutConfig, pageState } = useSelector(selectOverviewState);
  const hideFlyout = useCallback(() => dispatch(setFlyoutConfig(null)), [dispatch]);
  const forceRefreshCallback = useCallback(
    () => dispatch(quietFetchOverviewStatusAction.get({ pageState })),
    [dispatch, pageState]
  );

  return flyoutConfig ? (
    <MonitorDetailFlyout
      overviewItem={flyoutConfig}
      onClose={hideFlyout}
      onEnabledChange={forceRefreshCallback}
      onLocationChange={setFlyoutConfigCallback}
    />
  ) : null;
};

const CLOSE_FLYOUT_TEXT = i18n.translate('xpack.synthetics.monitorList.closeFlyoutText', {
  defaultMessage: 'Close',
});

const GO_TO_MONITOR_LINK_TEXT = i18n.translate('xpack.synthetics.monitorList.goToMonitorLinkText', {
  defaultMessage: 'Go to monitor',
});
