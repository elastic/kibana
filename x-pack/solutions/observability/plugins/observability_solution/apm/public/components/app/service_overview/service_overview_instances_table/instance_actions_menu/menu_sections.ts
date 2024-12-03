/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IBasePath } from '@kbn/core/public';
import moment from 'moment';
import { AllDatasetsLocatorParams } from '@kbn/deeplinks-observability/locators';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import { NodeLogsLocatorParams } from '@kbn/logs-shared-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { type AssetDetailsLocator } from '@kbn/observability-shared-plugin/common';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import {
  Action,
  getNonEmptySections,
  SectionRecord,
} from '../../../../shared/transaction_action_menu/sections_helper';

type InstaceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

function getInfraMetricsQuery(timestamp?: string) {
  if (!timestamp) {
    return undefined;
  }
  const timeInMilliseconds = new Date(timestamp).getTime();
  const fiveMinutes = moment.duration(5, 'minutes').asMilliseconds();

  return {
    from: new Date(timeInMilliseconds - fiveMinutes).toISOString(),
    to: new Date(timeInMilliseconds + fiveMinutes).toISOString(),
  };
}

export function getMenuSections({
  instanceDetails,
  basePath,
  onFilterByInstanceClick,
  metricsHref,
  allDatasetsLocator,
  nodeLogsLocator,
  assetDetailsLocator,
}: {
  instanceDetails: InstaceDetails;
  basePath: IBasePath;
  onFilterByInstanceClick: () => void;
  metricsHref: string;
  allDatasetsLocator: LocatorPublic<AllDatasetsLocatorParams>;
  nodeLogsLocator: LocatorPublic<NodeLogsLocatorParams>;
  assetDetailsLocator?: AssetDetailsLocator;
}) {
  const podId = instanceDetails.kubernetes?.pod?.uid;
  const containerId = instanceDetails.container?.id;
  const time = instanceDetails['@timestamp']
    ? new Date(instanceDetails['@timestamp']).valueOf()
    : undefined;
  const infraMetricsQuery = getInfraMetricsQuery(instanceDetails['@timestamp']);

  const podLogsHref = nodeLogsLocator.getRedirectUrl({
    nodeField: findInventoryFields('pod').id,
    nodeId: podId!,
    time,
  });

  const containerLogsHref = nodeLogsLocator.getRedirectUrl({
    nodeField: findInventoryFields('container').id,
    nodeId: containerId!,
    time,
  });

  const hasPodLink = !!podId && !!assetDetailsLocator;
  const hasContainerLink = !!containerId && !!assetDetailsLocator;

  const podActions: Action[] = [
    {
      key: 'podLogs',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.podLogs', {
        defaultMessage: 'Pod logs',
      }),
      href: podLogsHref,
      condition: !!podId,
    },
    {
      key: 'podMetrics',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.podMetrics', {
        defaultMessage: 'Pod metrics',
      }),
      href: hasPodLink
        ? assetDetailsLocator.getRedirectUrl({
            assetId: podId,
            assetType: 'pod',
            assetDetails: { dateRange: infraMetricsQuery },
          })
        : undefined,
      condition: hasPodLink,
    },
  ];

  const containerActions: Action[] = [
    {
      key: 'containerLogs',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.containerLogs', {
        defaultMessage: 'Container logs',
      }),
      href: containerLogsHref,
      condition: !!containerId,
    },
    {
      key: 'containerMetrics',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.containerMetrics',
        { defaultMessage: 'Container metrics' }
      ),
      href: hasContainerLink
        ? assetDetailsLocator.getRedirectUrl({
            assetId: containerId,
            assetType: 'container',
            assetDetails: { dateRange: infraMetricsQuery },
          })
        : undefined,
      condition: hasContainerLink,
    },
  ];

  const apmActions: Action[] = [
    {
      key: 'filterByInstance',
      label: i18n.translate(
        'xpack.apm.serviceOverview.instancesTable.actionMenus.filterByInstance',
        {
          defaultMessage: 'Filter overview by instance',
        }
      ),
      onClick: onFilterByInstanceClick,
      condition: true,
    },
    {
      key: 'analyzeRuntimeMetric',
      label: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.metrics', {
        defaultMessage: 'Metrics',
      }),
      href: metricsHref,
      condition: true,
    },
  ];

  const sectionRecord: SectionRecord = {
    observability: [
      {
        key: 'podDetails',
        title: i18n.translate('xpack.apm.serviceOverview.instancesTable.actionMenus.pod.title', {
          defaultMessage: 'Pod details',
        }),
        subtitle: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.pod.subtitle',
          {
            defaultMessage: 'View logs and metrics for this pod to get further details.',
          }
        ),
        actions: podActions,
      },
      {
        key: 'containerDetails',
        title: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.container.title',
          {
            defaultMessage: 'Container details',
          }
        ),
        subtitle: i18n.translate(
          'xpack.apm.serviceOverview.instancesTable.actionMenus.container.subtitle',
          {
            defaultMessage: 'View logs and metrics for this container to get further details.',
          }
        ),
        actions: containerActions,
      },
    ],
    apm: [{ key: 'apm', actions: apmActions }],
  };

  return getNonEmptySections(sectionRecord);
}
