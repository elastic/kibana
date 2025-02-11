/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { syntheticsMonitorType } from '../../common/types/saved_objects';
import {
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsMonitor,
} from '../../common/runtime_types';
import { normalizeSecrets } from '../synthetics_service/utils/secrets';

export const getSyntheticsMonitor = async ({
  monitorId,
  encryptedSavedObjectsClient,
  spaceId,
}: {
  monitorId: string;
  spaceId: string;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
}): Promise<SavedObject<SyntheticsMonitor>> => {
  try {
    const decryptedMonitor =
      await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        syntheticsMonitorType,
        monitorId,
        {
          namespace: spaceId,
        }
      );
    return normalizeSecrets(decryptedMonitor);
  } catch (e) {
    throw e;
  }
};
