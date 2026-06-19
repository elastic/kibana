/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenu,
  useEuiShadow,
  EuiPanel,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { FETCH_STATUS, useEsSearch } from '@kbn/observability-shared-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SYNTHETICS_MONITORS_EMBEDDABLE } from '../../../../../../../common/embeddables/monitors_overview/constants';
import { getSyntheticsCcsIndex } from '../../../../../../../common/get_synthetics_indices';
import { useCreateSLO } from '../../hooks/use_create_slo';
import { TEST_SCHEDULED_LABEL } from '../../../monitor_add_edit/form/run_test_btn';
import { useCanUsePublicLocById } from '../../hooks/use_can_use_public_loc_id';
import { toggleStatusAlert } from '../../../../../../../common/runtime_types/monitor_management/alert_config';
import {
  manualTestMonitorAction,
  manualTestRunInProgressSelector,
} from '../../../../state/manual_test_runs';
import { useMonitorAlertEnable } from '../../../../hooks/use_monitor_alert_enable';
import type { OverviewStatusMetaData } from '../../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../../common/runtime_types';
import { useCanEditSynthetics } from '../../../../../../hooks/use_capabilities';
import { useMonitorEnableHandler, useLocationName, useEnablement } from '../../../../hooks';
import { setFlyoutConfig } from '../../../../state/overview/actions';
import { useEditMonitorLocator } from '../../../../hooks/use_edit_monitor_locator';
import { useMonitorDetailLocator } from '../../../../hooks/use_monitor_detail_locator';
import { NoPermissionsTooltip } from '../../../common/components/permissions';
import { useAddToDashboard } from '../../../common/components/add_to_dashboard';
import { selectOverviewView } from '../../../../state';
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import {
  createRemoteMonitorCloneUrl,
  createRemoteMonitorEditUrl,
} from '../../../../utils/remote/remote_monitor_urls';

type PopoverPosition = 'relative' | 'default';

interface ActionContainerProps {
  boxShadow: string;
  position: PopoverPosition;
}

const Container = styled.div<ActionContainerProps>`
  ${({ position }) =>
    position === 'relative'
      ? // custom styles used to overlay the popover button on `MetricItem`
        `
  display: inline-block;
  position: relative;
  bottom: 42px;
  left: 12px;
  z-index: 1;
`
      : // otherwise, no custom position needed
        ''}

  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  ${({ boxShadow, position }) => (position === 'relative' ? boxShadow : '')}
`;

interface Props {
  isPopoverOpen: boolean;
  isInspectView?: boolean;
  monitor: OverviewStatusMetaData;
  setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  position: PopoverPosition;
  iconHasPanel?: boolean;
  iconSize?: 's' | 'xs';
  locationId: string;
  renderButton?: (onClick: () => void) => NonNullable<React.ReactNode>;
  // Optional override for the remote monitor's `kibanaUrl`. Callers that
  // already fetch the latest ping (e.g. the overview flyout via
  // `useMonitorDetail`) can supply it here so the popover doesn't need to
  // run its own fallback query. When omitted, the popover lazily fetches
  // the latest remote ping on first open if `monitor.remote.kibanaUrl` is
  // missing.
  kibanaUrl?: string;
}

/**
 * The overview-status `top_metrics` aggregation cannot collect text-mapped
 * fields like `kibanaUrl`, so the metadata threaded into each row may carry
 * `remote.remoteName` without a `remote.kibanaUrl`. The latest ping document
 * does carry `kibanaUrl` (and `remote.kibanaUrl`) on its `_source`, so we
 * fetch a single ping via CCS to fill the gap — mirroring the fallback the
 * overview flyout and details-page callout already use. Gated on `enabled`
 * (typically `isPopoverOpen`) so the fetch only happens once the user opens
 * the menu, never per row on initial render.
 */
const useRemoteKibanaUrlFallback = ({
  enabled,
  configId,
  remoteName,
}: {
  enabled: boolean;
  configId: string;
  remoteName?: string;
}): string | undefined => {
  const index = enabled && remoteName ? getSyntheticsCcsIndex(remoteName) : '';

  const { data } = useEsSearch<
    { kibanaUrl?: string; remote?: { kibanaUrl?: string } },
    SearchRequest
  >(
    {
      index,
      size: 1,
      query: {
        bool: {
          filter: [{ term: { config_id: configId } }],
        },
      },
      sort: [{ '@timestamp': 'desc' as const }],
      _source: ['kibanaUrl', 'remote.kibanaUrl'],
    },
    [enabled, configId, remoteName],
    { name: 'getOverviewActionsPopoverRemoteKibanaUrl' }
  );

  const ping = data?.hits?.hits?.[0]?._source;
  return ping?.remote?.kibanaUrl ?? ping?.kibanaUrl;
};

const CustomShadowPanel = styled(EuiPanel)<{ shadow: string }>`
  ${(props) => props.shadow}
`;

function IconPanel({ children, hasPanel }: { children: JSX.Element; hasPanel: boolean }) {
  const shadow = useEuiShadow('s');
  if (!hasPanel) return children;
  return (
    <CustomShadowPanel
      color="plain"
      element="button"
      grow={false}
      paddingSize="none"
      hasShadow={false}
      shadow={shadow}
    >
      {children}
    </CustomShadowPanel>
  );
}

export function ActionsPopover({
  isPopoverOpen,
  isInspectView,
  setIsPopoverOpen,
  monitor,
  position,
  iconHasPanel = true,
  iconSize = 's',
  locationId,
  renderButton,
  kibanaUrl: kibanaUrlProp,
}: Props) {
  const euiShadow = useEuiShadow('l');
  const dispatch = useDispatch();
  const locationName = useLocationName(monitor);
  const isRemote = Boolean(monitor.remote);
  const { space } = useKibanaSpace();

  // Resolve the remote `kibanaUrl` with the same precedence the flyout uses:
  //   1. an explicit value supplied by the parent (e.g. flyout),
  //   2. the value baked into the overview-status metadata,
  //   3. a lazy fetch of the latest ping when the popover opens.
  const monitorRemoteKibanaUrl = monitor.remote?.kibanaUrl;
  const fallbackKibanaUrl = useRemoteKibanaUrlFallback({
    enabled: isPopoverOpen && isRemote && !kibanaUrlProp && !monitorRemoteKibanaUrl,
    configId: monitor.configId,
    remoteName: monitor.remote?.remoteName,
  });
  const remoteKibanaUrl = kibanaUrlProp ?? monitorRemoteKibanaUrl ?? fallbackKibanaUrl;

  const { http } = useKibana().services;
  const locationLabel = monitor.locations[0]?.label ?? '';

  const detailUrl = useMonitorDetailLocator({
    configId: monitor.configId,
    locationId: locationId || monitor.locations[0]?.id || '',
    spaces: monitor.spaces,
    // The local Synthetics details page reads remote data via CCS when
    // `?remoteName=<alias>` is in the URL (see `useGetUrlParams` /
    // `useSelectedMonitor`), so "Go to monitor" stays an in-app navigation
    // for remote monitors instead of redirecting to the origin cluster.
    remoteName: monitor.remote?.remoteName,
  });
  const editUrl = useEditMonitorLocator({ configId: monitor.configId, spaces: monitor.spaces });

  const canEditSynthetics = useCanEditSynthetics();

  const canUsePublicLocations = useCanUsePublicLocById(monitor.configId);

  const { isServiceAllowed } = useEnablement();

  const labels = useMemo(
    () => ({
      enabledSuccessLabel: enabledSuccessLabel(monitor.name),
      disabledSuccessLabel: disabledSuccessLabel(monitor.name),
      failureLabel: enabledFailLabel(monitor.name),
    }),
    [monitor.name]
  );
  const { status, isEnabled, updateMonitorEnabledState } = useMonitorEnableHandler({
    configId: monitor.configId,
    isEnabled: monitor.isEnabled,
    labels,
  });

  const { alertStatus, updateAlertEnabledState } = useMonitorAlertEnable();
  const { CreateSLOFlyout, setIsSLOFlyoutOpen } = useCreateSLO({
    configId: monitor.configId,
    label: monitor.name,
    tags: monitor.tags,
  });

  const [enableLabel, setEnableLabel] = useState(
    monitor.isEnabled ? disableMonitorLabel : enableMonitorLabel
  );

  const testInProgress = useSelector(manualTestRunInProgressSelector(monitor.configId));

  const view = useSelector(selectOverviewView);

  useEffect(() => {
    if (status === FETCH_STATUS.LOADING) {
      setEnableLabel(loadingLabel(monitor.isEnabled));
    } else if (status === FETCH_STATUS.SUCCESS) {
      setEnableLabel(isEnabled ? disableMonitorLabel : enableMonitorLabel);
      if (isPopoverOpen) setIsPopoverOpen(false);
    }
  }, [setEnableLabel, status, isEnabled, monitor.isEnabled, isPopoverOpen, setIsPopoverOpen]);

  const quickInspectPopoverItem = {
    name: quickInspectName,
    icon: 'inspect',
    disabled: !locationName,
    onClick: () => {
      if (locationName) {
        dispatch(
          setFlyoutConfig({
            locationId,
            configId: monitor.configId,
            location: locationName,
            id: monitor.configId,
          })
        );
        setIsPopoverOpen(false);
      }
    },
  };

  const { MaybeSavedObjectSaveModalDashboard, setDashboardAttachmentReady } = useAddToDashboard({
    type: SYNTHETICS_MONITORS_EMBEDDABLE,
    embeddableInput: {
      filters: {
        monitor_ids: [{ label: monitor.name, value: monitor.configId }],
        tags: [],
        locations: [{ label: locationLabel, value: locationId }],
        monitor_types: [],
        projects: [],
      },
      view,
    },
    documentTitle: `${monitor.name} - ${locationLabel}`,
    objectType: i18n.translate('xpack.synthetics.overview.actions.addToDashboard.objectTypeLabel', {
      defaultMessage: 'Monitor Overview',
    }),
  });

  // For remote (CCS) monitors we mirror SLO's three-state pattern (see
  // `slo_item_actions.tsx`) for actions that *must* run on the origin
  // cluster (Edit, Clone, Enable/Disable):
  //   1. `monitor.remote.kibanaUrl` known   → action is enabled and opens the
  //      corresponding deep link on the origin cluster in a new tab.
  //   2. `monitor.remote.kibanaUrl` missing → action is disabled with a
  //      tooltip explaining the kibanaUrl gap, replacing the previous
  //      "hide actions for remote" behavior.
  //   3. The action has no remote equivalent (e.g. `Run test manually`,
  //      `Create SLO`, status alerts) → always disabled with a remote tooltip.
  //
  // "Go to monitor" is intentionally outside the pattern: the local details
  // page renders remote monitors via CCS when the URL carries
  // `?remoteName=<alias>`, so we keep the in-app navigation (`detailUrl`)
  // for both local and remote.
  const remoteEditUrl = useMemo(
    () =>
      isRemote
        ? createRemoteMonitorEditUrl({ monitor, spaceId: space?.id, kibanaUrl: remoteKibanaUrl })
        : undefined,
    [isRemote, monitor, space?.id, remoteKibanaUrl]
  );

  const remoteCloneUrl = useMemo(
    () =>
      isRemote
        ? createRemoteMonitorCloneUrl({ monitor, spaceId: space?.id, kibanaUrl: remoteKibanaUrl })
        : undefined,
    [isRemote, monitor, space?.id, remoteKibanaUrl]
  );

  const alertLoading = alertStatus(monitor.configId) === FETCH_STATUS.LOADING;

  const popoverItems: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: actionsMenuGoToMonitorName,
      icon: 'sortRight',
      // The local details page renders remote monitors via CCS when the URL
      // carries `?remoteName=<alias>`, so this stays an in-app navigation
      // for both local and remote monitors — no redirect to the origin
      // cluster's Kibana, no `target="_blank"`. The 3-state remote pattern
      // (with `remoteMonitorUrl` / popout) only applies to actions that
      // *must* run on the origin (Edit, Clone, Enable/Disable).
      href: detailUrl,
      'data-test-subj': 'actionsPopoverGoToMonitor',
    },
    quickInspectPopoverItem,
    {
      name: isRemote ? (
        runTestManually
      ) : testInProgress ? (
        <EuiToolTip content={TEST_SCHEDULED_LABEL}>
          <span tabIndex={0}>{runTestManually}</span>
        </EuiToolTip>
      ) : (
        <NoPermissionsTooltip
          canUsePublicLocations={canUsePublicLocations}
          canEditSynthetics={canEditSynthetics}
        >
          {runTestManually}
        </NoPermissionsTooltip>
      ),
      icon: 'flask',
      disabled: isRemote || testInProgress || !canUsePublicLocations || !isServiceAllowed,
      toolTipContent: isRemote ? NOT_AVAILABLE_FOR_REMOTE_MONITORS : undefined,
      onClick: isRemote
        ? undefined
        : () => {
            dispatch(
              manualTestMonitorAction.get({ configId: monitor.configId, name: monitor.name })
            );
            dispatch(setFlyoutConfig(null));
            setIsPopoverOpen(false);
          },
      'data-test-subj': 'syntheticsActionsPopoverRunTestManually',
    },
    {
      name: isRemote ? (
        actionsMenuEditMonitorName
      ) : (
        <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
          {actionsMenuEditMonitorName}
        </NoPermissionsTooltip>
      ),
      icon: 'pencil',
      disabled: isRemote ? !remoteEditUrl : !canEditSynthetics || !isServiceAllowed,
      href: isRemote ? remoteEditUrl : editUrl,
      target: isRemote ? '_blank' : undefined,
      toolTipContent:
        isRemote && !remoteEditUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : undefined,
      'data-test-subj': 'editMonitorLink',
    },
    {
      name: isRemote ? (
        actionsMenuCloneMonitorName
      ) : (
        <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
          {actionsMenuCloneMonitorName}
        </NoPermissionsTooltip>
      ),
      icon: 'copy',
      disabled: isRemote ? !remoteCloneUrl : !canEditSynthetics || !isServiceAllowed,
      href: isRemote
        ? remoteCloneUrl
        : http?.basePath.prepend(`synthetics/add-monitor?cloneId=${monitor.configId}`),
      target: isRemote ? '_blank' : undefined,
      toolTipContent:
        isRemote && !remoteCloneUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : undefined,
      'data-test-subj': 'cloneMonitorLink',
    },
    {
      name: isRemote ? (
        CREATE_SLO
      ) : (
        <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
          {CREATE_SLO}
        </NoPermissionsTooltip>
      ),
      icon: 'chartGauge',
      disabled: isRemote || !canEditSynthetics || !isServiceAllowed,
      toolTipContent: isRemote ? NOT_AVAILABLE_FOR_REMOTE_MONITORS : undefined,
      onClick: isRemote
        ? undefined
        : () => {
            setIsPopoverOpen(false);
            setIsSLOFlyoutOpen(true);
          },
      'data-test-subj': 'createSLOBtn',
    },
    {
      name: isRemote ? (
        enableLabel
      ) : (
        <NoPermissionsTooltip
          canEditSynthetics={canEditSynthetics}
          canUsePublicLocations={canUsePublicLocations}
        >
          {enableLabel}
        </NoPermissionsTooltip>
      ),
      icon: 'contrast',
      // The remote Synthetics monitor details page has no Enable/Disable
      // UI element and no `?enable=true`/`?disable=true` URL handler (unlike
      // SLOs, which read those params via `useGetQueryParams` and trigger
      // the action), so a deep link to the origin would land on a page that
      // can't act on the request. Until a destination handler is added,
      // mirror the other "no remote equivalent" actions and keep this item
      // disabled for remote monitors with the standard tooltip.
      disabled: isRemote || !canEditSynthetics || !canUsePublicLocations,
      toolTipContent: isRemote ? NOT_AVAILABLE_FOR_REMOTE_MONITORS : undefined,
      onClick: isRemote
        ? undefined
        : () => {
            if (status !== FETCH_STATUS.LOADING) {
              updateMonitorEnabledState(!monitor.isEnabled);
            }
          },
      'data-test-subj': 'syntheticsActionsPopoverEnableMonitor',
    },
    {
      name: isRemote ? (
        monitor.isStatusAlertEnabled ? (
          disableAlertLabel
        ) : (
          enableMonitorAlertLabel
        )
      ) : (
        <NoPermissionsTooltip
          canEditSynthetics={canEditSynthetics}
          canUsePublicLocations={canUsePublicLocations}
        >
          {monitor.isStatusAlertEnabled ? disableAlertLabel : enableMonitorAlertLabel}
        </NoPermissionsTooltip>
      ),
      disabled: isRemote || !canEditSynthetics || !canUsePublicLocations || !isServiceAllowed,
      toolTipContent: isRemote ? NOT_AVAILABLE_FOR_REMOTE_MONITORS : undefined,
      icon: alertLoading ? (
        <EuiLoadingSpinner size="s" />
      ) : monitor.isStatusAlertEnabled ? (
        'bellSlash'
      ) : (
        'bell'
      ),
      onClick: isRemote
        ? undefined
        : () => {
            if (!alertLoading) {
              updateAlertEnabledState({
                monitor: {
                  [ConfigKey.ALERT_CONFIG]: toggleStatusAlert({
                    status: {
                      enabled: monitor.isStatusAlertEnabled,
                    },
                  }),
                },
                configId: monitor.configId,
                name: monitor.name,
              });
            }
          },
    },
    {
      name: addMonitorToDashboardLabel,
      icon: 'dashboardApp',
      // The Synthetics overview embeddable filter schema (`monitorFiltersSchema`)
      // can only narrow by `monitor_ids` (saved-object IDs); the dashboard's
      // overview-status query has no remote-cluster filter and doesn't narrow
      // pings by `monitor.id`. For a remote monitor that means the embeddable
      // cannot isolate the single configId — `SingleMonitorView` then violates
      // its "exactly one monitor" invariant and throws. Until the embeddable
      // schema/query learn about remote clusters, mirror the other local-only
      // actions and disable this one for remote monitors with the standard
      // tooltip (was previously hidden, see PR #267516).
      disabled: isRemote,
      toolTipContent: isRemote ? NOT_AVAILABLE_FOR_REMOTE_MONITORS : undefined,
      onClick: isRemote
        ? undefined
        : () => {
            setIsPopoverOpen(false);
            setDashboardAttachmentReady(true);
          },
      'data-test-subj': 'syntheticsActionsPopoverAddToDashboard',
    },
  ];

  const visiblePopoverItems = isInspectView
    ? popoverItems.filter((i) => i !== quickInspectPopoverItem)
    : popoverItems;

  return (
    <>
      <Container boxShadow={euiShadow} position={position}>
        <EuiPopover
          button={
            renderButton ? (
              renderButton(() => setIsPopoverOpen((b: boolean) => !b))
            ) : (
              <IconPanel hasPanel={iconHasPanel}>
                <EuiToolTip content={openActionsMenuAria} disableScreenReaderOutput>
                  <EuiButtonIcon
                    data-test-subj="syntheticsActionsPopoverButton"
                    aria-label={openActionsMenuAria}
                    iconType="boxesVertical"
                    color="primary"
                    size={iconSize}
                    display="empty"
                    onClick={() => setIsPopoverOpen((b: boolean) => !b)}
                  />
                </EuiToolTip>
              </IconPanel>
            )
          }
          color="lightestShade"
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          anchorPosition="rightUp"
          panelPaddingSize="none"
        >
          <EuiContextMenu
            initialPanelId={0}
            panels={[
              {
                id: '0',
                title: actionsMenuTitle,
                items: visiblePopoverItems,
              },
            ]}
          />
        </EuiPopover>
      </Container>
      {CreateSLOFlyout}
      {MaybeSavedObjectSaveModalDashboard}
    </>
  );
}

const quickInspectName = i18n.translate('xpack.synthetics.overview.actions.quickInspect.title', {
  defaultMessage: 'Quick inspect',
});

const runTestManually = i18n.translate('xpack.synthetics.overview.actions.runTestManually.title', {
  defaultMessage: 'Run test manually',
});

const openActionsMenuAria = i18n.translate(
  'xpack.synthetics.overview.actions.openPopover.ariaLabel',
  {
    defaultMessage: 'Open actions menu',
  }
);

const actionsMenuTitle = i18n.translate('xpack.synthetics.overview.actions.menu.title', {
  defaultMessage: 'Actions',
  description: 'This is the text in the heading of a menu containing a set of actions',
});

const actionsMenuGoToMonitorName = i18n.translate(
  'xpack.synthetics.overview.actions.goToMonitor.name',
  {
    defaultMessage: 'Go to monitor',
    description:
      'This is the text for a menu item that will take the user to the monitor detail page',
  }
);

const actionsMenuEditMonitorName = i18n.translate(
  'xpack.synthetics.overview.actions.editMonitor.name',
  {
    defaultMessage: 'Edit monitor',
    description:
      'This is the text for a menu item that will take the user to the monitor edit page',
  }
);

const actionsMenuCloneMonitorName = i18n.translate(
  'xpack.synthetics.overview.actions.cloneMonitor.name',
  {
    defaultMessage: 'Clone monitor',
  }
);

const CREATE_SLO = i18n.translate('xpack.synthetics.overview.actions.createSlo.name', {
  defaultMessage: 'Create SLO',
});

const loadingLabel = (isEnabled: boolean) =>
  isEnabled
    ? i18n.translate('xpack.synthetics.overview.actions.disablingLabel', {
        defaultMessage: 'Disabling monitor',
      })
    : i18n.translate('xpack.synthetics.overview.actions.enablingLabel', {
        defaultMessage: 'Enabling monitor',
      });

const enableMonitorLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelEnableMonitor',
  {
    defaultMessage: 'Enable monitor (all locations)',
  }
);

const disableMonitorLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelDisableMonitor',
  {
    defaultMessage: 'Disable monitor (all locations)',
  }
);

const disableAlertLabel = i18n.translate(
  'xpack.synthetics.overview.actions.disableLabelDisableAlert',
  {
    defaultMessage: 'Disable status alerts (all locations)',
  }
);

const enableMonitorAlertLabel = i18n.translate(
  'xpack.synthetics.overview.actions.enableLabelDisableAlert',
  {
    defaultMessage: 'Enable status alerts (all locations)',
  }
);

const addMonitorToDashboardLabel = i18n.translate(
  'xpack.synthetics.overview.actions.addToDashboard',
  {
    defaultMessage: 'Add to dashboard',
  }
);

const enabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.enabledSuccessLabel', {
    defaultMessage: 'Monitor "{name}" enabled successfully',
    values: { name },
  });

export const disabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.disabledSuccessLabel', {
    defaultMessage: 'Monitor "{name}" disabled successfully.',
    values: { name },
  });

export const enabledFailLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.enabledFailLabel', {
    defaultMessage: 'Unable to update monitor "{name}".',
    values: { name },
  });

const NOT_AVAILABLE_FOR_REMOTE_MONITORS = i18n.translate(
  'xpack.synthetics.overview.actions.notAvailableForRemote',
  {
    defaultMessage: 'This action is not available for remote monitors',
  }
);

const NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL = i18n.translate(
  'xpack.synthetics.overview.actions.remoteKibanaUrlUndefined',
  {
    defaultMessage: 'This action is not available for remote monitors with undefined kibanaUrl',
  }
);
