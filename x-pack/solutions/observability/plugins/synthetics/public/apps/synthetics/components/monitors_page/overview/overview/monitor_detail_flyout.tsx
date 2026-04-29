/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import type { ClientPluginsStart } from '../../../../../../plugin';
import { useMonitorDetail } from '../../../../hooks/use_monitor_detail';
import { useMonitorDetailLocator } from '../../../../hooks/use_monitor_detail_locator';
import { useEditMonitorLocator } from '../../../../hooks/use_edit_monitor_locator';
import { useMonitorHealthColor } from '../../hooks/use_monitor_health_color';
import {
  getMonitorAction,
  selectMonitorUpsertStatus,
  selectOverviewFlyoutConfig,
  selectOverviewPageState,
  selectSyntheticsMonitor,
  selectSyntheticsMonitorError,
  selectSyntheticsMonitorLoading,
  setFlyoutConfig,
} from '../../../../state';
import { MonitorDetailsPanel } from '../../../common/components/monitor_details_panel';
import { ErrorCallout } from '../../../common/components/error_callout';
import { useMonitorAttachmentConfigWithMonitor } from '../../../monitor_details/hooks/use_monitor_attachment_config';
import type { OverviewStatusMetaData } from '../types';
import { ConfigKey } from '../types';
import { ActionsPopover } from './actions_popover';
import type { FlyoutParamProps } from './types';
import {
  quietFetchOverviewStatusAction,
  selectOverviewStatus,
} from '../../../../state/overview_status';
import { MonitorStatusPanel } from '../../../monitor_details/monitor_status/monitor_status_panel';
import { FlyoutLastTestRun, FlyoutSummaryKPIs } from './flyout_panels';

interface Props {
  configId: string;
  id: string;
  location: string;
  locationId: string;
  spaces?: string[];
  onClose: () => void;
  onEnabledChange: () => void;
  onLocationChange: (params: FlyoutParamProps) => void;
}

const DEFAULT_DURATION_CHART_FROM = 'now-12h';
const DEFAULT_CURRENT_DURATION_CHART_TO = 'now';
const DEFAULT_PREVIOUS_DURATION_CHART_FROM = 'now-24h';
const DEFAULT_PREVIOUS_DURATION_CHART_TO = 'now-12h';

const VIS_COLORS = [
  'euiColorVis0',
  'euiColorVis1',
  'euiColorVis2',
  'euiColorVis3',
  'euiColorVis4',
  'euiColorVis5',
  'euiColorVis6',
  'euiColorVis7',
  'euiColorVis8',
  'euiColorVis9',
] as const;

function DetailFlyoutDurationChart({
  id,
  location,
  allLocations,
}: {
  id: string;
  location: string;
  allLocations: Array<{ id: string; label: string }>;
}) {
  const { euiTheme } = useEuiTheme();
  const [showAllLocations, setShowAllLocations] = useState(false);

  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const attributes = useMemo(() => {
    if (showAllLocations) {
      return allLocations.map((loc, idx) => ({
        seriesType: 'line' as const,
        color: euiTheme.colors.vis[VIS_COLORS[idx % VIS_COLORS.length]],
        time: {
          from: DEFAULT_DURATION_CHART_FROM,
          to: DEFAULT_CURRENT_DURATION_CHART_TO,
        },
        reportDefinitions: {
          'monitor.id': [id],
          'observer.geo.name': [loc.label],
        },
        filters: [{ field: 'observer.geo.name', values: [loc.label] }],
        dataType: 'synthetics' as const,
        selectedMetricField: 'monitor.duration.us',
        name: loc.label,
        operationType: 'average' as const,
      }));
    }
    return [
      {
        seriesType: 'area' as const,
        color: euiTheme.colors.vis.euiColorVis1,
        time: {
          from: DEFAULT_DURATION_CHART_FROM,
          to: DEFAULT_CURRENT_DURATION_CHART_TO,
        },
        reportDefinitions: {
          'monitor.id': [id],
          'observer.geo.name': [location],
        },
        filters: [{ field: 'observer.geo.name', values: [location] }],
        dataType: 'synthetics' as const,
        selectedMetricField: 'monitor.duration.us',
        name: DURATION_SERIES_NAME,
        operationType: 'average' as const,
      },
      {
        seriesType: 'line' as const,
        color: euiTheme.colors.vis.euiColorVis7,
        time: {
          from: DEFAULT_PREVIOUS_DURATION_CHART_FROM,
          to: DEFAULT_PREVIOUS_DURATION_CHART_TO,
        },
        reportDefinitions: {
          'monitor.id': [id],
          'observer.geo.name': [location],
        },
        filters: [{ field: 'observer.geo.name', values: [location] }],
        dataType: 'synthetics' as const,
        selectedMetricField: 'monitor.duration.us',
        name: PREVIOUS_PERIOD_SERIES_NAME,
        operationType: 'average' as const,
      },
    ];
  }, [showAllLocations, allLocations, id, location, euiTheme.colors.vis]);

  return (
    <EuiPageSection bottomBorder="extended">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{DURATION_HEADER_TEXT}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {allLocations.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={ALL_LOCATIONS_LABEL}
              checked={showAllLocations}
              onChange={(e) => setShowAllLocations(e.target.checked)}
              compressed
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ExploratoryViewEmbeddable
        customHeight="200px"
        reportType="kpi-over-time"
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={true}
        legendPosition="bottom"
        attributes={attributes}
      />
    </EuiPageSection>
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

function DetailFlyoutStatusHistory({ configId, location }: { configId: string; location: string }) {
  return (
    <EuiPageSection bottomBorder="extended">
      <EuiTitle size="xs">
        <h3>{DOWNTIME_HISTORY_LABEL}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <MonitorStatusPanel
        from="now-24h"
        to="now"
        brushable={false}
        periodCaption={LAST_24H_TEXT}
        monitorId={configId}
        locationLabel={location}
      />
    </EuiPageSection>
  );
}

export function MonitorDetailFlyout(props: Props) {
  const { id, configId, onLocationChange, locationId, spaces } = props;

  const { status: overviewStatus } = useSelector(selectOverviewStatus);

  const monitor: OverviewStatusMetaData | undefined = useMemo(() => {
    if (!overviewStatus) return undefined;
    const allConfigs = Object.values({
      ...(overviewStatus.upConfigs ?? {}),
      ...(overviewStatus.downConfigs ?? {}),
      ...(overviewStatus.pendingConfigs ?? {}),
      ...(overviewStatus.disabledConfigs ?? {}),
    });
    return allConfigs.find((ov) => ov.configId === configId);
  }, [overviewStatus, configId]);

  const setLocation = useCallback(
    (locId: string, locLabel: string) =>
      onLocationChange({ id, configId, location: locLabel, locationId: locId, spaces }),
    [onLocationChange, id, configId, spaces]
  );

  const detailLink = useMonitorDetailLocator({
    configId,
    locationId,
    spaces,
  });

  const editLink = useEditMonitorLocator({ configId, spaces });

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

  const monitorDetail = useMonitorDetail(configId, props.location);

  const getColor = useMonitorHealthColor();

  useMonitorAttachmentConfigWithMonitor(
    monitorObject
      ? {
          ...monitorObject,
          [ConfigKey.CONFIG_ID]: monitorObject[ConfigKey.CONFIG_ID] ?? configId,
        }
      : null,
    isLoading
  );

  const [isPush, setIsPush] = useState(() => localStorage.getItem(FLYOUT_MODE_KEY) === 'push');

  const toggleFlyoutMode = useCallback(() => {
    setIsPush((prev) => {
      const next = !prev;
      localStorage.setItem(FLYOUT_MODE_KEY, next ? 'push' : 'overlay');
      return next;
    });
  }, []);

  const displayName = monitor?.name ?? monitorObject?.[ConfigKey.NAME] ?? configId;

  const [selectedTab, setSelectedTab] = useState<FlyoutTabId>('overview');

  return (
    <EuiFlyout
      size="m"
      maxWidth={1000}
      type={isPush ? 'push' : 'overlay'}
      onClose={props.onClose}
      paddingSize="none"
      resizable
    >
      {error && !isLoading && <ErrorCallout {...error} />}
      <EuiFlyoutHeader hasBorder>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
            <EuiFlexItem grow>
              <EuiTitle size="s">
                <h2>{displayName}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={isPush ? UNDOCK_LABEL : DOCK_LABEL} display="block">
                <EuiButtonIcon
                  data-test-subj="syntheticsFlyoutToggleMode"
                  iconType={isPush ? 'menuLeft' : 'menuRight'}
                  aria-label={isPush ? UNDOCK_LABEL : DOCK_LABEL}
                  onClick={toggleFlyoutMode}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {monitor && (
                <ActionsPopover
                  isPopoverOpen={isActionsPopoverOpen}
                  isInspectView
                  monitor={monitor}
                  setIsPopoverOpen={setIsActionsPopoverOpen}
                  position="default"
                  locationId={locationId}
                  renderButton={(onClick) => (
                    <EuiButtonEmpty
                      data-test-subj="syntheticsFlyoutActionsButton"
                      size="s"
                      iconType="arrowDown"
                      iconSide="right"
                      onClick={onClick}
                    >
                      {ACTIONS_LABEL}
                    </EuiButtonEmpty>
                  )}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          {monitor && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {SELECT_LOCATION_LABEL}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="m" wrap responsive={false}>
                {monitor.locations.map((loc) => {
                  const isSelected = loc.label === props.location;
                  return (
                    <EuiFlexItem grow={false} key={loc.id}>
                      <EuiHealth
                        color={getColor(loc.status)}
                        css={{
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 400,
                          cursor: isSelected ? 'default' : 'pointer',
                          textDecoration: isSelected ? 'underline' : 'none',
                        }}
                        onClick={!isSelected ? () => setLocation(loc.id, loc.label) : undefined}
                        data-test-subj={`syntheticsFlyoutLocationHealth-${loc.id}`}
                      >
                        {loc.label}
                      </EuiHealth>
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
        <EuiTabs css={{ paddingLeft: 24, paddingRight: 24 }}>
          {FLYOUT_TABS.map(({ id: tabId, label }) => (
            <EuiTab
              key={tabId}
              isSelected={tabId === selectedTab}
              onClick={() => setSelectedTab(tabId)}
              data-test-subj={`syntheticsFlyoutTab-${tabId}`}
            >
              {label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={{ '.euiFlyoutBody__overflowContent': { padding: 16 } }}>
        {selectedTab === 'overview' && (
          <>
            <FlyoutLastTestRun
              latestPing={monitorDetail.data}
              loading={Boolean(monitorDetail.loading)}
              configId={configId}
              locationId={locationId}
            />
            <FlyoutSummaryKPIs
              monitorId={id}
              locationLabel={props.location}
              from="now-30d"
              to="now"
              dateLabel={LAST_30_DAYS_LABEL}
            />
            <DetailFlyoutStatusHistory configId={configId} location={props.location} />
          </>
        )}
        {selectedTab === 'performance' && (
          <DetailFlyoutDurationChart
            id={id}
            location={props.location}
            allLocations={monitor?.locations ?? []}
          />
        )}
        {selectedTab === 'details' &&
          (monitorObject ? (
            <MonitorDetailsPanel
              hasBorder={false}
              latestPing={monitorDetail.data}
              configId={configId}
              monitor={{
                ...monitorObject,
                id,
              }}
              loading={Boolean(isLoading)}
            />
          ) : (
            <EuiFlexGroup justifyContent="center" css={{ padding: 24 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="transparent">
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="syntheticsMonitorDetailFlyoutCloseButton"
                onClick={props.onClose}
              >
                {CLOSE_FLYOUT_TEXT}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="syntheticsMonitorDetailFlyoutEditButton"
                    isDisabled={!editLink}
                    href={editLink}
                    iconType="pencil"
                  >
                    {EDIT_MONITOR_LINK_TEXT}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="syntheticsMonitorDetailFlyoutButton"
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
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const dispatch = useDispatch();

  const flyoutConfig = useSelector(selectOverviewFlyoutConfig);
  const pageState = useSelector(selectOverviewPageState);
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

const ALL_LOCATIONS_LABEL = i18n.translate('xpack.synthetics.flyout.allLocationsLabel', {
  defaultMessage: 'All locations',
});

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

const DOWNTIME_HISTORY_LABEL = i18n.translate('xpack.synthetics.flyout.downtimeHistoryLabel', {
  defaultMessage: 'Downtime history',
});

const LAST_24H_TEXT = i18n.translate('xpack.synthetics.flyout.last24hCaption', {
  defaultMessage: 'Last 24 hours',
});

const LAST_30_DAYS_LABEL = i18n.translate('xpack.synthetics.flyout.last30daysLabel', {
  defaultMessage: 'Last 30 days',
});

const CLOSE_FLYOUT_TEXT = i18n.translate('xpack.synthetics.monitorList.closeFlyoutText', {
  defaultMessage: 'Close',
});

const EDIT_MONITOR_LINK_TEXT = i18n.translate('xpack.synthetics.monitorList.editMonitorLinkText', {
  defaultMessage: 'Edit monitor',
});

const GO_TO_MONITOR_LINK_TEXT = i18n.translate('xpack.synthetics.monitorList.goToMonitorLinkText', {
  defaultMessage: 'Go to monitor',
});

const ACTIONS_LABEL = i18n.translate('xpack.synthetics.flyout.actionsLabel', {
  defaultMessage: 'Actions',
});

const SELECT_LOCATION_LABEL = i18n.translate('xpack.synthetics.flyout.selectLocationLabel', {
  defaultMessage: 'Select location',
});

const DOCK_LABEL = i18n.translate('xpack.synthetics.flyout.dock', {
  defaultMessage: 'Dock flyout',
});

const UNDOCK_LABEL = i18n.translate('xpack.synthetics.flyout.undock', {
  defaultMessage: 'Undock flyout',
});

const FLYOUT_MODE_KEY = 'synthetics.flyout.mode';

type FlyoutTabId = 'overview' | 'performance' | 'details';

const FLYOUT_TABS: Array<{ id: FlyoutTabId; label: string }> = [
  {
    id: 'overview',
    label: i18n.translate('xpack.synthetics.flyout.tab.overview', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'performance',
    label: i18n.translate('xpack.synthetics.flyout.tab.performance', {
      defaultMessage: 'Performance',
    }),
  },
  {
    id: 'details',
    label: i18n.translate('xpack.synthetics.flyout.tab.details', {
      defaultMessage: 'Details',
    }),
  },
];
