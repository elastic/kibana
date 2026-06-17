/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiContextMenuItem } from '@elastic/eui';

import { useCanEditSynthetics } from '../../../../../hooks/use_capabilities';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { NoPermissionsTooltip } from '../../common/components/permissions';
import { useGetUrlParams } from '../../../hooks';
import { isRemoteSyntheticsMonitor } from '../../../../../../common/runtime_types';
import { createRemoteMonitorEditUrl } from '../../../utils/remote/remote_monitor_urls';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';

export const EditMonitorLink = () => {
  const { basePath } = useSyntheticsSettingsContext();

  const { monitorId } = useParams<{ monitorId: string }>();
  const { spaceId } = useGetUrlParams();
  const canEditSynthetics = useCanEditSynthetics();
  const isLinkDisabled = !canEditSynthetics;
  const linkProps = isLinkDisabled
    ? { disabled: true }
    : {
        href:
          `${basePath}/app/synthetics/edit-monitor/${monitorId}` +
          (spaceId ? `?spaceId=${spaceId}` : ''),
      };

  return (
    <NoPermissionsTooltip canEditSynthetics={canEditSynthetics}>
      <EuiButton
        data-test-subj="syntheticsEditMonitorLinkButton"
        fill
        iconType="pencil"
        iconSide="left"
        {...linkProps}
      >
        {EDIT_MONITOR}
      </EuiButton>
    </NoPermissionsTooltip>
  );
};

export const EditMonitorContextItem = ({ isRemote = false }: { isRemote?: boolean }) => {
  const { basePath } = useSyntheticsSettingsContext();
  const { monitorId } = useParams<{ monitorId: string }>();
  const { remoteName, spaceId } = useGetUrlParams();
  const canEditSynthetics = useCanEditSynthetics();
  const { monitor } = useSelectedMonitor();

  if (isRemote) {
    // Three-state pattern modeled on SLO's `header_control.tsx`:
    //   1. `kibanaUrl` known   → render as enabled, target=_blank, popout icon.
    //   2. `kibanaUrl` missing → render disabled with the "undefined kibanaUrl"
    //      tooltip so the user understands why we cannot deep-link.
    // The synthesized `monitor.remote.kibanaUrl` already bakes in the
    // `latestPing.kibanaUrl` fallback (see `use_remote_monitor.ts`), so it is
    // the single source of truth for the deep link.
    const remoteKibanaUrl = isRemoteSyntheticsMonitor(monitor)
      ? monitor.remote.kibanaUrl
      : undefined;
    const remoteEditUrl = remoteName
      ? createRemoteMonitorEditUrl({
          monitor: {
            configId: monitorId,
            remote: { remoteName, ...(remoteKibanaUrl ? { kibanaUrl: remoteKibanaUrl } : {}) },
          },
          spaceId,
        })
      : undefined;
    const hasUndefinedRemoteKibanaUrl = !remoteEditUrl;

    // `EuiContextMenuItem` already renders a popout indicator automatically
    // when `target="_blank"` is set, so we don't append our own icon.
    return (
      <EuiContextMenuItem
        icon="pencil"
        data-test-subj="syntheticsEditMonitorContextItem"
        href={remoteEditUrl}
        target={remoteEditUrl ? '_blank' : undefined}
        disabled={hasUndefinedRemoteKibanaUrl}
        toolTipContent={
          hasUndefinedRemoteKibanaUrl ? NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL : undefined
        }
      >
        {EDIT_MONITOR}
      </EuiContextMenuItem>
    );
  }

  const isLinkDisabled = !canEditSynthetics;
  const linkProps = isLinkDisabled
    ? { disabled: true }
    : {
        href:
          `${basePath}/app/synthetics/edit-monitor/${monitorId}` +
          (spaceId ? `?spaceId=${spaceId}` : ''),
      };

  return (
    <EuiContextMenuItem
      icon={'pencil'}
      data-test-subj="syntheticsEditMonitorContextItem"
      {...linkProps}
      disabled={isLinkDisabled}
    >
      {EDIT_MONITOR}
    </EuiContextMenuItem>
  );
};

const EDIT_MONITOR = i18n.translate('xpack.synthetics.monitorSummary.editMonitor', {
  defaultMessage: 'Edit monitor',
});

const NOT_AVAILABLE_FOR_UNDEFINED_REMOTE_KIBANA_URL = i18n.translate(
  'xpack.synthetics.monitorDetails.actions.remoteKibanaUrlUndefined',
  {
    defaultMessage: 'This action is not available for remote monitors with undefined kibanaUrl',
  }
);
