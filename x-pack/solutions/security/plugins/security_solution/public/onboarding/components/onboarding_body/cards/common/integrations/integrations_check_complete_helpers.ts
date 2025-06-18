/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { EPM_API_ROUTES, installationStatuses } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';
import { AGENT_INDEX } from './constants';
import type { StartServices } from '../../../../../../types';

export const getCompleteBadgeText = (installedCount: number) =>
  i18n.translate('xpack.securitySolution.onboarding.integrationsCard.badge.completeText', {
    defaultMessage: '{count} {count, plural, one {integration} other {integrations}} added',
    values: { count: installedCount },
  });

export const getActiveIntegrationList = async (
  services: StartServices,
  /**
   * The list of available integrations to check against.
   * If provided, only installed integrations that are in this list will be considered complete.
   * If not provided, all installed integrations will be considered complete.
   */
  availableIntegrationNames?: Array<IntegrationCardItem['name']>
) => {
  const activePackageData = await services.http
    .get<GetInstalledPackagesResponse>(`${EPM_API_ROUTES.INSTALLED_LIST_PATTERN}`, {
      version: '2023-10-31',
      query: {
        showOnlyActiveDataStreams: true,
      },
    })
    .catch((err: Error) => {
      const emptyItems: GetInstalledPackagesResponse['items'] = [];
      services.notifications.toasts.addError(err, {
        title: i18n.translate(
          'xpack.securitySolution.onboarding.integrationsCard.checkComplete.fetchIntegrations.errorTitle',
          {
            defaultMessage: 'Error fetching integrations data',
          }
        ),
      });
      return { items: emptyItems };
    });

  const activePackages =
    activePackageData?.items?.filter((installedPkg) => {
      const isInstalled =
        (installedPkg.status === installationStatuses.Installed ||
          installedPkg.status === installationStatuses.InstallFailed) &&
        installedPkg.dataStreams.length > 0;
      return availableIntegrationNames
        ? isInstalled &&
            availableIntegrationNames.some(
              (availableIntegration) => availableIntegration === installedPkg.name
            )
        : isInstalled;
    }) ?? [];
  const isComplete = activePackages && activePackages.length > 0;

  return { isComplete, activePackages };
};

export const getAgentsData = async (services: StartServices, isComplete: boolean) => {
  const agentsData = await lastValueFrom(
    services.data.search.search({
      params: { index: AGENT_INDEX, body: { size: 1 } },
    })
  ).catch((err: Error) => {
    services.notifications.toasts.addError(err, {
      title: i18n.translate(
        'xpack.securitySolution.onboarding.integrationsCard.checkComplete.fetchAgents.errorTitle',
        {
          defaultMessage: 'Error fetching agents data',
        }
      ),
    });
    return { rawResponse: { hits: { total: 0 } } };
  });

  const agentsDataAvailable = !!agentsData?.rawResponse?.hits?.total;
  // If the integration card is complete (has one active integration), we don't need to check for agents data
  const isAgentRequired = !isComplete && !agentsDataAvailable;
  return { isAgentRequired, agentsData };
};
