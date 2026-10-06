/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SyntheticsRestApiRouteFactory } from '../types';
import {
  privateLocationShardingAPIKeySavedObject,
  syntheticsServiceAPIKeySavedObject,
} from '../../saved_objects/service_api_key';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  generateAndSaveServiceAPIKey,
  getAPIKeyForSyntheticsService,
  getSyntheticsEnablement,
} from '../../synthetics_service/get_api_key';
import {
  generateAndSavePrivateLocationShardingApiKey,
  getPrivateLocationShardingApiKey,
} from '../../synthetics_service/private_location/get_sharding_api_key';

export const getSyntheticsEnablementRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT,
  writeAccess: false,
  validate: {},
  handler: async ({
    savedObjectsClient,
    request,
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const isServiceAllowed = syntheticsMonitorClient.syntheticsService.isAllowed;
    const result = await getSyntheticsEnablement({
      server,
    });
    const { canEnable, isEnabled } = result;
    const { security } = server;
    const { apiKey, isValid } = await getAPIKeyForSyntheticsService({
      server,
    });
    if (apiKey && !isValid) {
      await syntheticsServiceAPIKeySavedObject.delete(savedObjectsClient);
      await security.authc.apiKeys?.invalidateAsInternalUser({
        ids: [apiKey.id],
      });
    }
    const regenerationRequired = !isEnabled || !isValid;
    const shouldEnableApiKey = server.config.service?.manifestUrl || server.config.service?.devUrl;
    if (!shouldEnableApiKey && !isValid) {
      const shardingApiKey = await getPrivateLocationShardingApiKey({ server });
      if (shardingApiKey.apiKey && !shardingApiKey.isValid) {
        await privateLocationShardingAPIKeySavedObject.delete(savedObjectsClient);
        await security.authc.apiKeys.invalidateAsInternalUser({
          ids: [shardingApiKey.apiKey.id],
        });
      }
      if (!shardingApiKey.isValid) {
        try {
          await generateAndSavePrivateLocationShardingApiKey({
            request,
            savedObjectsClient,
            server,
          });
        } catch (error) {
          server.logger.debug(
            `Unable to create private location sharding API key: ${error.message}`
          );
        }
      }
      return { ...result, isServiceAllowed };
    }
    if (canEnable && regenerationRequired && shouldEnableApiKey) {
      await generateAndSaveServiceAPIKey({
        request,
        authSavedObjectsClient: savedObjectsClient,
        server,
      });
    } else {
      return { ...result, isServiceAllowed };
    }

    const res = await getSyntheticsEnablement({
      server,
    });

    return { ...res, isServiceAllowed };
  },
});

export const disableSyntheticsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({
    response,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
  }): Promise<any> => {
    const { security } = server;
    const { syntheticsService } = syntheticsMonitorClient;
    const { canEnable } = await getSyntheticsEnablement({ server });
    if (!canEnable) {
      return response.forbidden();
    }
    await syntheticsService.deleteAllConfigs();
    const { apiKey } = await getAPIKeyForSyntheticsService({
      server,
    });
    const { apiKey: shardingApiKey } = await getPrivateLocationShardingApiKey({ server });
    await syntheticsServiceAPIKeySavedObject.delete(savedObjectsClient);
    await privateLocationShardingAPIKeySavedObject.delete(savedObjectsClient);
    if (apiKey?.id) {
      await security.authc.apiKeys?.invalidateAsInternalUser({ ids: [apiKey.id] });
    }
    if (shardingApiKey?.id) {
      await security.authc.apiKeys.invalidateAsInternalUser({ ids: [shardingApiKey.id] });
    }
    return response.ok({});
  },
});
