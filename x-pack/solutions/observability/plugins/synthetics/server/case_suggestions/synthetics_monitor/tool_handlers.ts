/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SuggestionPayload } from '@kbn/observability-case-suggestion-registry-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';
import type { PageAttachmentPersistedState } from '@kbn/observability-schema';
import { getSavedObjectKqlFilter } from '../../routes/common';
import { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { MonitorConfigRepository } from '../../services/monitor_config_repository';

export const getSyntheticsMonitorByServiceName = async ({
  savedObjectsClient,
  encryptedSavedObjectsClient,
  serviceName,
  share,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  serviceName: string;
  share: SharePluginStart;
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
      attachments: result.saved_objects.map((obj) => {
        const persistableStateAttachmentState: PageAttachmentPersistedState = {
          type: 'synthetics_monitor',
          url: {
            label: `"${obj.attributes.name}" monitor details`,
            actionLabel: 'View monitor',
            iconType: 'logoObservability',
            pathAndQuery: `app/synthetics/monitor/${obj.attributes.id}/history?locationId=us_central&dateRangeStart=2025-07-14T12:59:31.281Z&dateRangeEnd=2025-07-15T12:59:31.281Z`,
          },
        };
        return {
          attachment: {
            persistableStateAttachmentState,
            persistableStateAttachmentTypeId: '.page',
            type: 'persistableState',
          },
          payload: obj.attributes,
        };
      }),
    },
  };
};
