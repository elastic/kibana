/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SecurityClusterPrivilege,
  SecurityCreateApiKeyResponse,
  SecurityIndexPrivilege,
} from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import type { SyntheticsServerSetup } from '../types';
import { syntheticsServiceAPIKeySavedObject } from '../saved_objects/service_api_key';
import type { SyntheticsServiceApiKey } from '../../common/runtime_types/synthetics_service_api_key';
import { checkHasPrivileges } from './authentication/check_has_privilege';

export const syntheticsIndex = 'synthetics-*';

const REQUIRED_INDEX_PRIVILEGES = [
  'auto_configure',
  'create_doc',
  'view_index_metadata',
  'read',
] as const;

export type ApiKeyInvalidReason = 'missing' | 'invalid' | 'insufficient_privileges' | 'error';

export interface GetSyntheticsApiKeyResult {
  apiKey?: SyntheticsServiceApiKey;
  isValid: boolean;
  reason?: ApiKeyInvalidReason;
  missingPrivileges?: string[];
}

export const getApiKeyInvalidTelemetryPayload = ({
  reason,
  missingPrivileges,
}: {
  reason: ApiKeyInvalidReason;
  missingPrivileges?: string[];
}): { code: ApiKeyInvalidReason; reason: string; message: string } => {
  switch (reason) {
    case 'missing':
      return {
        code: reason,
        reason: 'Synthetics service API key is missing.',
        message: 'Failed to push configs. Synthetics service API key is missing.',
      };
    case 'insufficient_privileges': {
      const privilegesSuffix =
        missingPrivileges && missingPrivileges.length > 0
          ? ` Missing privileges: ${missingPrivileges.join(', ')}.`
          : '';
      return {
        code: reason,
        reason: 'API key is missing required index privileges.',
        message: `Failed to push configs. API key is missing required index privileges.${privilegesSuffix}`,
      };
    }
    case 'error':
      return {
        code: reason,
        reason: 'Failed to validate API key.',
        message: 'Failed to push configs. Failed to validate API key.',
      };
    case 'invalid':
    default:
      return {
        code: 'invalid',
        reason: 'API key is not valid.',
        message: 'Failed to push configs. API key is not valid.',
      };
  }
};

export const getServiceApiKeyPrivileges = (isServerlessEs: boolean) => {
  const cluster: SecurityClusterPrivilege[] = ['monitor', 'read_pipeline'];
  if (isServerlessEs === false) cluster.push('read_ilm');
  return {
    cluster,
    indices: [
      {
        names: [syntheticsIndex],
        privileges: [
          'view_index_metadata',
          'create_doc',
          'auto_configure',
          'read',
        ] as SecurityIndexPrivilege[],
      },
    ],
    run_as: [],
  };
};

export const getAPIKeyForSyntheticsService = async ({
  server,
}: {
  server: SyntheticsServerSetup;
}): Promise<GetSyntheticsApiKeyResult> => {
  try {
    const apiKey = await syntheticsServiceAPIKeySavedObject.get(server);

    if (!apiKey) {
      return { isValid: false, reason: 'missing' };
    }

    // Validate before privilege checks — a revoked key makes hasPrivileges throw (e.g. 401),
    // which would otherwise be reported as `error` instead of `invalid`.
    const isValid = await server.security.authc.apiKeys.validate({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    });

    if (!isValid) {
      return { apiKey, isValid: false, reason: 'invalid' };
    }

    const { index } = await checkHasPrivileges(server, apiKey);
    const indexPermissions = index[syntheticsIndex];
    const missingPrivileges = REQUIRED_INDEX_PRIVILEGES.filter(
      (privilege) => !indexPermissions?.[privilege]
    );

    if (missingPrivileges.length > 0) {
      return {
        apiKey,
        isValid: false,
        reason: 'insufficient_privileges',
        missingPrivileges: [...missingPrivileges],
      };
    }

    return { apiKey, isValid: true };
  } catch (error) {
    server.logger.error(`API key is invalid, ${error.message}`, { error });
    return { isValid: false, reason: 'error' };
  }
};

export const generateAPIKey = async ({
  server,
  request,
}: {
  server: SyntheticsServerSetup;
  request: KibanaRequest;
}) => {
  const { isElasticsearchServerless, security } = server;
  const isApiKeysEnabled = await security.authc.apiKeys?.areAPIKeysEnabled();

  if (!isApiKeysEnabled) {
    throw new Error('Please enable API keys in kibana to use synthetics service.');
  }

  const { canEnable } = await hasEnablePermissions(server);
  if (!canEnable) {
    throw new SyntheticsForbiddenError();
  }

  /* Not exposed to the user. May grant as internal user */
  return security.authc.apiKeys?.grantAsInternalUser(request, {
    name: 'synthetics-api-key (required for Synthetics App)',
    role_descriptors: {
      synthetics_writer: getServiceApiKeyPrivileges(isElasticsearchServerless),
    },
    metadata: {
      description:
        'Created for synthetics service to be passed to the heartbeat to communicate with ES',
      managed: true,
    },
  });
};

export const generateProjectAPIKey = async ({
  server,
  request,
  accessToElasticManagedLocations = true,
  spaces = [ALL_SPACES_ID],
}: {
  server: SyntheticsServerSetup;
  request: KibanaRequest;
  accessToElasticManagedLocations?: boolean;
  spaces?: string[];
}): Promise<SecurityCreateApiKeyResponse | null> => {
  const { security } = server;
  const isApiKeysEnabled = await security.authc.apiKeys?.areAPIKeysEnabled();

  if (!isApiKeysEnabled) {
    throw new Error('Please enable API keys in kibana to use synthetics service.');
  }

  /* Exposed to the user. Must create directly with the user */
  return security.authc.apiKeys?.create(request, {
    name: 'synthetics-api-key (required for project monitors)',
    kibana_role_descriptors: {
      uptime_save: {
        elasticsearch: {},
        kibana: [
          {
            base: [],
            spaces,
            feature: {
              uptime: [accessToElasticManagedLocations ? 'all' : 'minimal_all'],
            },
          },
        ],
      },
    },
    metadata: {
      description:
        'Created for the Synthetics Agent to be able to communicate with Kibana for generating monitors for projects',
    },
  });
};

export const generateAndSaveServiceAPIKey = async ({
  server,
  request,
  authSavedObjectsClient,
}: {
  server: SyntheticsServerSetup;
  request: KibanaRequest;
  // authSavedObject is needed for write operations
  authSavedObjectsClient?: SavedObjectsClientContract;
}) => {
  const apiKeyResult = await generateAPIKey({ server, request });

  if (apiKeyResult) {
    const { id, name, api_key: apiKey } = apiKeyResult;
    const apiKeyObject = { id, name, apiKey };
    if (authSavedObjectsClient) {
      // discard decoded key and rest of the keys
      await syntheticsServiceAPIKeySavedObject.set(authSavedObjectsClient, apiKeyObject);
    }
    return apiKeyObject;
  }
};

export const getSyntheticsEnablement = async ({ server }: { server: SyntheticsServerSetup }) => {
  const { security, config } = server;

  const [apiKey, hasPrivileges, areApiKeysEnabled] = await Promise.all([
    getAPIKeyForSyntheticsService({ server }),
    hasEnablePermissions(server),
    security.authc.apiKeys.areAPIKeysEnabled(),
  ]);

  const { canEnable, canManageApiKeys } = hasPrivileges;

  if (!config.service?.manifestUrl && !config.service?.devUrl) {
    return {
      canEnable: true,
      canManageApiKeys,
      isEnabled: true,
      isValidApiKey: true,
      areApiKeysEnabled: true,
    };
  }

  return {
    canEnable,
    canManageApiKeys,
    isEnabled: Boolean(apiKey?.apiKey),
    isValidApiKey: apiKey?.isValid,
    areApiKeysEnabled,
  };
};

const hasEnablePermissions = async ({
  syntheticsEsClient,
  isElasticsearchServerless,
}: SyntheticsServerSetup) => {
  const { cluster: clusterPrivs, indices: index } =
    getServiceApiKeyPrivileges(isElasticsearchServerless);
  const hasPrivileges = await syntheticsEsClient.baseESClient.security.hasPrivileges({
    cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key', ...clusterPrivs],
    index,
  });

  const { cluster } = hasPrivileges;
  const {
    manage_security: manageSecurity,
    manage_api_key: manageApiKey,
    manage_own_api_key: manageOwnApiKey,
    monitor,
    // `read_ilm` is going to be `undefined` when ES is in serverless mode,
    // so we default it to the ES capabilities value.
    read_ilm: readILM = isElasticsearchServerless,
    read_pipeline: readPipeline,
  } = cluster || {};

  const canManageApiKeys = manageSecurity || manageApiKey || manageOwnApiKey;
  const hasClusterPermissions = readILM && readPipeline && monitor;
  const hasIndexPermissions = !Object.values(hasPrivileges.index?.['synthetics-*'] || []).includes(
    false
  );

  return {
    canManageApiKeys,
    canEnable: hasClusterPermissions && hasIndexPermissions,
  };
};

export class SyntheticsForbiddenError extends Error {
  constructor() {
    super();
    this.message = 'Forbidden';
    this.name = 'SyntheticsForbiddenError';
  }
}
