/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux-v7';
import { useParams } from 'react-router-dom';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useGetUrlParams } from '../../hooks';
import { useUrlSpaceId } from '../../hooks/use_url_space_id';
import { buildMonitorParamsSearch } from '../../utils/url_params';
import { selectSyntheticsMonitor } from '../../state';
import { MONITOR_NOT_FOUND_TITLE } from '../monitor_details/monitor_not_found_page';
import { ConfigKey } from '../../../../../common/runtime_types';
import { MONITOR_ROUTE, MONITORS_ROUTE } from '../../../../../common/constants';
import { PLUGIN } from '../../../../../common/constants/plugin';

interface MonitorAddEditBreadcrumbOptions {
  monitorNotFound?: boolean;
}

export const useMonitorAddEditBreadcrumbs = (
  isEdit?: boolean,
  { monitorNotFound }: MonitorAddEditBreadcrumbOptions = {}
) => {
  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';
  const spaceId = useUrlSpaceId();
  // Read from the URL; avoid hooks that write `locationId` back into it.
  const { locationId, remoteName } = useGetUrlParams();
  const { monitorId } = useParams<{ monitorId?: string }>();
  const monitor = useSelector(selectSyntheticsMonitor);
  const configId = monitor?.[ConfigKey.CONFIG_ID];
  const monitorName = monitor?.name;

  const crumbs = useMemo<ChromeBreadcrumb[]>(() => {
    if (!isEdit) {
      return [{ text: ADD_MONITOR_CRUMB }];
    }

    const monitorsCrumb = { text: MONITORS_CRUMB, href: `${appPath}${MONITORS_ROUTE}` };

    if (monitorNotFound) {
      return [monitorsCrumb, { text: MONITOR_NOT_FOUND_TITLE }];
    }

    const editCrumb = { text: EDIT_MONITOR_CRUMB };

    if (!configId || !monitorName || configId !== monitorId) {
      return [monitorsCrumb, editCrumb];
    }

    return [
      monitorsCrumb,
      {
        text: monitorName,
        href: `${appPath}${monitorDetailPath(configId)}${buildMonitorParamsSearch({
          locationId,
          spaceId,
          remoteName,
        })}`,
      },
      editCrumb,
    ];
  }, [
    appPath,
    configId,
    isEdit,
    locationId,
    monitorId,
    monitorName,
    monitorNotFound,
    remoteName,
    spaceId,
  ]);

  useBreadcrumbs(crumbs);
};

// Replace the full optional token (`:monitorId?`), otherwise `?` collides with the query string.
const monitorDetailPath = (configId: string) => MONITOR_ROUTE.replace(':monitorId?', configId);

const MONITORS_CRUMB = i18n.translate('xpack.synthetics.monitorsPage.monitorsMCrumb', {
  defaultMessage: 'Monitors',
});

export const ADD_MONITOR_CRUMB = i18n.translate(
  'xpack.synthetics.monitorManagement.addMonitorCrumb',
  {
    defaultMessage: 'Create monitor',
  }
);

export const EDIT_MONITOR_CRUMB = i18n.translate(
  'xpack.synthetics.monitorManagement.editMonitorCrumb',
  {
    defaultMessage: 'Edit monitor',
  }
);
