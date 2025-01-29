/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import {
  apmEnableContinuousRollups,
  apmEnableServiceMetrics,
} from '@kbn/observability-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import type { InfraPluginRequestHandlerContext } from '../../types';
import type { InfraBackendLibs } from '../infra_types';

export type ApmDataAccessClient = ReturnType<typeof getApmDataAccessClient>;
export type ApmDataAccessServicesWrapper = Awaited<ReturnType<ApmDataAccessClient['getServices']>>;

export const getApmDataAccessClient = ({
  libs,
  context,
  request,
}: {
  libs: InfraBackendLibs;
  context: InfraPluginRequestHandlerContext;
  request: KibanaRequest;
}) => {
  const hasPrivileges = async () => {
    const apmDataAccessStart = await libs.plugins.apmDataAccess.start();
    return apmDataAccessStart.hasPrivileges({ request });
  };

  const getServices = async () => {
    const apmDataAccess = libs.plugins.apmDataAccess.setup;

    const coreContext = await context.core;

    const { savedObjects, uiSettings, elasticsearch } = coreContext;
    const savedObjectsClient = savedObjects.client;
    const esClient = elasticsearch.client.asCurrentUser;
    const uiSettingsClient = uiSettings.client;

    const [apmIndices, includeFrozen] = await Promise.all([
      apmDataAccess.getApmIndices(savedObjectsClient),
      uiSettingsClient.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
    ]);

    const services = apmDataAccess.getServices({
      apmEventClient: new APMEventClient({
        indices: apmIndices,
        options: {
          includeFrozen,
        },
        debug: false,
        esClient,
        request,
      }),
    });

    return {
      ...services,
      getDocumentSources: async ({
        start,
        end,
        kuery = '',
      }: {
        start: number;
        end: number;
        kuery?: string;
      }) => {
        const [enableContinuousRollups, enableServiceTransactionMetrics] = await Promise.all([
          uiSettingsClient.get<boolean>(apmEnableContinuousRollups),
          uiSettingsClient.get<boolean>(apmEnableServiceMetrics),
        ]);

        return services.getDocumentSources({
          start,
          end,
          kuery,
          enableContinuousRollups,
          enableServiceTransactionMetrics,
        });
      },
    };
  };

  return { hasPrivileges, getServices };
};
