/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import { FlyoutParamProps } from './types';
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import { MonitorDetailsPanel } from '../../../common/components/monitor_details_panel';
import { ClientPluginsStart } from '../../../../../../plugin';
import { LocationsStatus, useStatusByLocation } from '../../../../hooks/use_status_by_location';
import { ActionsPopover } from './actions_popover';
import {
  getMonitorAction,
  selectMonitorUpsertStatus,
  selectOverviewState,
  selectServiceLocationsState,
  selectSyntheticsMonitor,
  selectSyntheticsMonitorError,
  selectSyntheticsMonitorLoading,
  setFlyoutConfig,
} from '../../../../state';
import { ErrorCallout } from '../../../common/components/error_callout';
import { MonitorStatus } from '../../../common/components/monitor_status';
import { useMonitorDetail } from '../../../../hooks/use_monitor_detail';
import { useOverviewStatus } from '../../hooks/use_overview_status';
import { MonitorEnabled } from '../../management/monitor_list_table/monitor_enabled';
import { ConfigKey, EncryptedSyntheticsMonitor, OverviewStatusMetaData } from '../types';
import { useMonitorDetailLocator } from '../../../../hooks/use_monitor_detail_locator';
import { getMonitorSpaceToAppend } from '../../../../hooks/use_edit_monitor_locator';
import { MonitorLocationSelect } from '../../../common/components/monitor_location_select';
import { quietFetchOverviewStatusAction } from '../../../../state/overview_status';

interface Props {
  configId: string;
  id: string;
  location: string;
  locationId: string;
  spaces?: string[];
  onClose: () => void;
  onEnabledChange: () => void;
  onLocationChange: (params: FlyoutParamProps) => void;
  currentDurationChartFrom?: string;
  currentDurationChartTo?: string;
  previousDurationChartFrom?: string;
  previousDurationChartTo?: string;
}

const DURATION_CHART_LOOKBACK_HOURS = 12;
const DEFAULT_DURATION_CHART_FROM = `now-${DURATION_CHART_LOOKBACK_HOURS}h`;
const DEFAULT_CURRENT_DURATION_CHART_TO = 'now';
const DEFAULT_PREVIOUS_DURATION_CHART_FROM = `now-${DURATION_CHART_LOOKBACK_HOURS * 2}h`;
const DEFAULT_PREVIOUS_DURATION_CHART_TO = DEFAULT_DURATION_CHART_FROM;

/**
 * For monitors younger than the 12h window, anchor the lower bound at creation
 * time and drop the previous-period comparison — otherwise the mostly-empty
 * window collapses each series to a single point and the chart looks empty (#221399).
 */
export const getDurationChartTimeRange = (
  createdAt?: string,
  now: moment.Moment = moment()
): { from: string; showPreviousPeriod: boolean } => {
  if (createdAt) {
    const created = moment(createdAt);
    if (
      created.isValid() &&
      created.isAfter(now.clone().subtract(DURATION_CHART_LOOKBACK_HOURS, 'hours'))
    ) {
      return { from: created.toISOString(), showPreviousPeriod: false };
    }
  }
  return { from: DEFAULT_DURATION_CHART_FROM, showPreviousPeriod: true };
};

function DetailFlyoutDurationChart({
  id,
  location,
  currentDurationChartFrom,
  currentDurationChartTo,
  previousDurationChartFrom,
  previousDurationChartTo,
  createdAt,
}: Pick<
  Props,
  | 'id'
  | 'location'
  | 'currentDurationChartFrom'
  | 'currentDurationChartTo'
  | 'previousDurationChartFrom'
  | 'previousDurationChartTo'
> & { createdAt?: string }) {
  const theme = useTheme();

  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { from: chartFrom, showPreviousPeriod } = useMemo(
    () => getDurationChartTimeRange(createdAt),
    [createdAt]
  );

  return (
    <EuiPageSection bottomBorder="extended">
      <EuiTitle size="xs">
        <h3>{DURATION_HEADER_TEXT}</h3>
      </EuiTitle>
      <ExploratoryViewEmbeddable
        customHeight="200px"
        reportType="kpi-over-time"
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={true}
        legendPosition="bottom"
        attributes={[
          {
            seriesType: 'area',
            color: theme?.eui?.euiColorVis1,
            time: {
              from: currentDurationChartFrom ?? chartFrom,
              to: currentDurationChartTo ?? DEFAULT_CURRENT_DURATION_CHART_TO,
            },
            reportDefinitions: {
              'monitor.id': [id],
              'observer.geo.name': [location],
            },
            filters: [
              {
                field: 'observer.geo.name',
                values: [location],
              },
            ],
            dataType: 'synthetics',
            selectedMetricField: 'monitor.duration.us',
            name: DURATION_SERIES_NAME,
            operationType: 'average',
          },
          ...(showPreviousPeriod
            ? [
                {
                  seriesType: 'line' as const,
                  color: theme?.eui?.euiColorVis7,
                  time: {
                    from: previousDurationChartFrom ?? DEFAULT_PREVIOUS_DURATION_CHART_FROM,
                    to: previousDurationChartTo ?? DEFAULT_PREVIOUS_DURATION_CHART_TO,
                  },
                  reportDefinitions: {
                    'monitor.id': [id],
                    'observer.geo.name': [location],
                  },
                  filters: [
                    {
                      field: 'observer.geo.name',
                      values: [location],
                    },
                  ],
                  dataType: 'synthetics' as const,
                  selectedMetricField: 'monitor.duration.us',
                  name: PREVIOUS_PERIOD_SERIES_NAME,
                  operationType: 'average' as const,
                },
              ]
            : []),
        ]}
      />
    </EuiPageSection>
  );
}

function DetailedFlyoutHeader({
  locations,
  currentLocation,
  configId,
  setCurrentLocation,
  monitor,
  onEnabledChange,
}: {
  locations: LocationsStatus;
  currentLocation: string;
  configId: string;
  monitor: EncryptedSyntheticsMonitor;
  onEnabledChange: () => void;
  setCurrentLocation: (location: string, locationId: string) => void;
}) {
  const status = locations.find((l) => l.label === currentLocation)?.status;
  const { locations: allLocations } = useSelector(selectServiceLocationsState);

  const selectedLocation = allLocations.find((ll) => ll.label === currentLocation);

  return (
    <EuiFlexGroup wrap={true} responsive={false}>
      <EuiFlexItem grow={false}>
        <MonitorStatus status={status} monitor={monitor} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MonitorLocationSelect
          compressed
          monitorLocations={monitor.locations}
          configId={configId}
          selectedLocation={selectedLocation}
          onChange={useCallback(
            (id: any, label: any) => {
              if (currentLocation !== label) setCurrentLocation(label, id);
            },
            [currentLocation, setCurrentLocation]
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList align="left" compressed>
          <EuiDescriptionListTitle>{ENABLED_ITEM_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <MonitorEnabled configId={configId} monitor={monitor} reloadPage={onEnabledChange} />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
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

export function MonitorDetailFlyout(props: Props) {
  const { id, configId, onLocationChange, locationId, spaces } = props;

  const { status: overviewStatus } = useOverviewStatus({ scopeStatusByLocation: true });

  const monitor: OverviewStatusMetaData | undefined = useMemo(() => {
    const allConfigs = Object.values({
      ...(overviewStatus?.upConfigs ?? {}),
      ...(overviewStatus?.downConfigs ?? {}),
    });
    const overviewItem = allConfigs.find((ov) => ov.configId === configId);
    if (overviewItem) return overviewItem;
  }, [overviewStatus?.upConfigs, overviewStatus?.downConfigs, configId]);

  // Ping-backed charts query `monitor.id`. For project monitors that is
  // `custom_heartbeat_id` (`monitorQueryId`), not the saved-object UUID.
  const monitorQueryId = monitor?.monitorQueryId ?? id;

  const setLocation = useCallback(
    (location: string, locationIdT: string) =>
      onLocationChange({
        id: monitorQueryId,
        configId,
        location,
        locationId: locationIdT,
        spaces,
      }),
    [onLocationChange, monitorQueryId, configId, spaces]
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
  const currentMonitorObject =
    monitorObject?.[ConfigKey.CONFIG_ID] === configId ? monitorObject : null;
  // Duration chart reads pings by monitor.id, not the saved object. Wait for
  // the matching SO so we don't apply a stale `created_at`, but still render
  // (default 12h window) when the SO 404s — e.g. cross-space monitors whose
  // overview metadata is already on `monitor`.
  const canRenderDurationChart =
    Boolean(currentMonitorObject) || Boolean(monitor && error && !isLoading);

  const upsertSuccess = upsertStatus?.status === 'success';

  const { space } = useKibanaSpace();

  const { spaceId: crossSpaceId } = getMonitorSpaceToAppend(space, spaces);

  useEffect(() => {
    // `useKibanaSpace` resolves asynchronously, so `space` is undefined on
    // the first render. `getMonitorSpaceToAppend` short-circuits to `{}` in
    // that case, which means an early dispatch would fetch the SO from the
    // active space and 404 for cross-space monitors. The follow-up dispatch
    // (after `space` resolves) is silently dropped by the `takeLeading`
    // saga while the first request is still in flight, leaving the 404 in
    // Redux state forever. Wait for the active space before dispatching.
    if (!space) return;
    dispatch(
      getMonitorAction.get({
        monitorId: configId,
        ...(crossSpaceId ? { spaceId: crossSpaceId } : {}),
      })
    );
  }, [configId, crossSpaceId, dispatch, space, upsertSuccess]);

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const monitorDetail = useMonitorDetail(configId, props.location);
  const { locations } = useStatusByLocation({
    configId,
    monitorLocations: monitorObject?.locations,
  });

  const isOverlay = useIsWithinMaxBreakpoint('xl');

  return (
    <EuiFlyout
      size="600px"
      type={isOverlay ? 'overlay' : 'push'}
      onClose={props.onClose}
      paddingSize="none"
    >
      {/*
        For cross-space monitors the saved-object fetch may legitimately 404
        when the user can't read the SO from the active space, even though the
        heartbeat-based `monitor` metadata renders the flyout fine. Don't
        alarm the user with a "fetch failed" callout if we already have the
        overview metadata to render — only surface real errors when there's
        nothing else to show.
      */}
      {error && !isLoading && !monitor && <ErrorCallout {...error} />}
      {isLoading && !monitor && !monitorObject && <LoadingState />}
      {(monitorObject || monitor) && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
              <EuiFlexGroup responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>{monitorObject?.[ConfigKey.NAME] ?? monitor?.name ?? configId}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {monitor && (
                    <ActionsPopover
                      isPopoverOpen={isActionsPopoverOpen}
                      isInspectView
                      monitor={monitor}
                      setIsPopoverOpen={setIsActionsPopoverOpen}
                      position="default"
                      iconHasPanel={false}
                      iconSize="xs"
                      locationId={locationId}
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
              {monitorObject && (
                <>
                  <EuiSpacer size="m" />
                  <DetailedFlyoutHeader
                    currentLocation={props.location}
                    locations={locations}
                    setCurrentLocation={setLocation}
                    configId={configId}
                    monitor={monitorObject}
                    onEnabledChange={props.onEnabledChange}
                  />
                </>
              )}
            </EuiPanel>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {canRenderDurationChart ? (
              <DetailFlyoutDurationChart
                {...props}
                id={monitorQueryId}
                location={props.location}
                createdAt={currentMonitorObject?.created_at}
              />
            ) : (
              <LoadingState />
            )}
            {currentMonitorObject && (
              <MonitorDetailsPanel
                hasBorder={false}
                hideEnabled
                latestPing={monitorDetail.data}
                configId={configId}
                monitor={{
                  ...currentMonitorObject,
                  id: monitorQueryId,
                }}
                loading={Boolean(isLoading)}
              />
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
        </>
      )}
    </EuiFlyout>
  );
}

export const MaybeMonitorDetailsFlyout = ({
  setFlyoutConfigCallback,
}: {
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const dispatch = useDispatch();

  const { flyoutConfig, pageState } = useSelector(selectOverviewState);
  const hideFlyout = useCallback(() => dispatch(setFlyoutConfig(null)), [dispatch]);
  const forceRefreshCallback = useCallback(
    () => dispatch(quietFetchOverviewStatusAction.get({ pageState })),
    [dispatch, pageState]
  );

  return flyoutConfig?.configId && flyoutConfig?.location ? (
    <MonitorDetailFlyout
      configId={flyoutConfig.configId}
      id={flyoutConfig.id}
      location={flyoutConfig.location}
      locationId={flyoutConfig.locationId}
      spaces={flyoutConfig.spaces}
      onClose={hideFlyout}
      onEnabledChange={forceRefreshCallback}
      onLocationChange={setFlyoutConfigCallback}
    />
  ) : null;
};

const DURATION_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.durationHeaderText', {
  defaultMessage: 'Duration',
});

const DURATION_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.durationSeriesName',
  {
    defaultMessage: 'Duration',
  }
);

const PREVIOUS_PERIOD_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.previousPeriodSeriesName',
  {
    defaultMessage: 'Previous period',
  }
);

const ENABLED_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.enabledItemText', {
  defaultMessage: 'Enabled (all locations)',
});

const CLOSE_FLYOUT_TEXT = i18n.translate('xpack.synthetics.monitorList.closeFlyoutText', {
  defaultMessage: 'Close',
});

const GO_TO_MONITOR_LINK_TEXT = i18n.translate('xpack.synthetics.monitorList.goToMonitorLinkText', {
  defaultMessage: 'Go to monitor',
});
