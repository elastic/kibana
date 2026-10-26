/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '@kbn/fleet-plugin/server/services';
import { isSecretStorageEnabled } from '@kbn/fleet-plugin/server/services/secrets';
import type { SyntheticsServerSetup } from '../types';

/**
 * Whether Fleet secret storage is enabled, checked as the internal user. When it is
 * disabled Fleet stores the delivered credential blob in plaintext in the agent policy.
 * `valueOnError` decides what a failed check means: the UI status passes `true` to avoid
 * a false alarm, credential delivery passes `false` to fail closed.
 */
export const getFleetSecretStorageEnabled = async (
  server: SyntheticsServerSetup,
  valueOnError: boolean
): Promise<boolean> => {
  try {
    const esClient = server.coreStart.elasticsearch.client.asInternalUser;
    const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
    return await isSecretStorageEnabled(esClient, soClient);
  } catch (e) {
    server.logger.error(`Vault: failed to determine Fleet secret storage status: ${e.message}`);
    return valueOnError;
  }
};
