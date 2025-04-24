/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagesResponse, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { EPM_API_ROUTES, installationStatuses } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { AGENT_INDEX } from './constants';
import type { StartServices } from '../../../../../../types';

export const getCompleteBadgeText = (installedCount: number) =>
  i18n.translate('xpack.securitySolution.onboarding.integrationsCard.badge.completeText', {
    defaultMessage: '{count} {count, plural, one {integration} other {integrations}} added',
    values: { count: installedCount },
  });

export const getIntegrationList = async (
  services: StartServices,
  /**
   * The list of available integrations to check against.
   * If provided, only installed integrations that are in this list will be considered complete.
   * If not provided, all installed integrations will be considered complete.
   */
  availableIntegrations?: Array<IntegrationCardItem['id']>
) => {
  const packageData = await services.http
    .get<GetPackagesResponse>(EPM_API_ROUTES.INSTALL_BY_UPLOAD_PATTERN, {
      version: '2023-10-31',
    })
    .catch((err: Error) => {
      const emptyItems: GetPackagesResponse['items'] = [];
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

  const installedPackages = packageData?.items?.filter((pkg) => {
    const integrationCardId = `epr:${pkg.id}`;
    const isInstalled =
      pkg.status === installationStatuses.Installed ||
      pkg.status === installationStatuses.InstallFailed;
    return availableIntegrations
      ? isInstalled &&
          availableIntegrations.some(
            (availableIntegration) =>
              availableIntegration === integrationCardId || availableIntegration === pkg.name
          )
      : isInstalled;
  });
  const isComplete = installedPackages && installedPackages.length > 0;

  return { isComplete, installedPackages };
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
  const isAgentRequired = isComplete && !agentsDataAvailable;
  return { isAgentRequired, agentsData };
};
