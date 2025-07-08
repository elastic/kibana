/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SuggestionPayload } from '@kbn/observability-case-suggestion-registry-plugin/server/services/case_suggestion_registry';
import { getSavedObjectKqlFilter } from '../../routes/common';
import { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { MonitorConfigRepository } from '../../services/monitor_config_repository';

export const getSyntheticsMonitorByServiceName = async ({
  savedObjectsClient,
  encryptedSavedObjectsClient,
  serviceName,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  serviceName: string;
}): Promise<SuggestionPayload> => {
  const serviceNameFilter = getSavedObjectKqlFilter({
    field: 'service.name',
    values: serviceName,
  });
  const monitorConfigRepository = new MonitorConfigRepository(
    savedObjectsClient,
    encryptedSavedObjectsClient
  );
  const result = await monitorConfigRepository.find<EncryptedSyntheticsMonitorAttributes>({
    filter: serviceNameFilter,
    perPage: 10,
  });

  return {
    suggestionId: 'synthetics_monitor',
    data: {
      attachments: result.saved_objects.map((obj) => ({
        attachment: {},
        payload: obj.attributes,
      })),
    },
  };
};
