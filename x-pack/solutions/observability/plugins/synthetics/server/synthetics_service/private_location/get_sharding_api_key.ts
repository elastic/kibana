/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { SecurityIndexPrivilege } from '@elastic/elasticsearch/lib/api/types';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import type { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { privateLocationShardingApiKeySavedObject } from '../../saved_objects/private_location_sharding_api_key';
import type { SyntheticsServerSetup } from '../../types';
import { getFakeKibanaRequest } from '../utils/fake_kibana_request';

const PRIVATE_LOCATION_SHARDING_API_KEY_NAME = 'synthetics-private-location-sharding';
const SHARDING_INDEX_PRIVILEGES: SecurityIndexPrivilege[] = ['read', 'view_index_metadata'];

const getRoleDescriptor = () => ({
  indices: [
    {
      names: [SYNTHETICS_INDEX_PATTERN],
      privileges: SHARDING_INDEX_PRIVILEGES,
    },
  ],
});

export const getPrivateLocationShardingApiKey = async ({
  server,
}: {
  server: SyntheticsServerSetup;
}): Promise<{ apiKey?: SyntheticsServiceApiKey; isValid: boolean }> => {
  try {
    const apiKey = await privateLocationShardingApiKeySavedObject.get(server);
    if (!apiKey) {
      return { isValid: false };
    }

    const [isValid, privileges] = await Promise.all([
      server.security.authc.apiKeys.validate({
        id: apiKey.id,
        api_key: apiKey.apiKey,
      }),
      server.coreStart.elasticsearch.client
        .asScoped(getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey }))
        .asCurrentUser.security.hasPrivileges({
          index: getRoleDescriptor().indices,
        }),
    ]);
    const indexPrivileges = privileges.index?.[SYNTHETICS_INDEX_PATTERN];
    const hasRequiredPrivileges = SHARDING_INDEX_PRIVILEGES.every(
      (privilege) => indexPrivileges?.[privilege] === true
    );

    return { apiKey, isValid: isValid && hasRequiredPrivileges };
  } catch (error) {
    server.logger.error(`Private location sharding API key is invalid, ${error.message}`, {
      error,
    });
    return { isValid: false };
  }
};

export const generateAndSavePrivateLocationShardingApiKey = async ({
  server,
  request,
  savedObjectsClient,
}: {
  server: SyntheticsServerSetup;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SyntheticsServiceApiKey | undefined> => {
  const result = await server.security.authc.apiKeys.grantAsInternalUser(request, {
    name: PRIVATE_LOCATION_SHARDING_API_KEY_NAME,
    role_descriptors: {
      synthetics_private_location_sharding: getRoleDescriptor(),
    },
    metadata: {
      description: 'Created for Synthetics private location shard rebalancing',
      managed: true,
    },
  });

  if (!result) {
    return;
  }

  const apiKey = {
    id: result.id,
    name: result.name,
    apiKey: result.api_key,
  };
  await privateLocationShardingApiKeySavedObject.set(savedObjectsClient, apiKey);
  return apiKey;
};
