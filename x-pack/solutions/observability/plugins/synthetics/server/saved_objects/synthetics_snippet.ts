/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SyntheticsServerSetup } from '../types';
import type { SyntheticsServiceSnippet } from '../../common/runtime_types/synthetics_service_snippet';

// export const syntheticsApiKeyID = 'ba997842-b0cf-4429-aa9d-578d9bf0d391';
export const syntheticsSnippetObjectTypeName = 'synthetics-snippet';

export const syntheticsSnippetType: SavedObjectsType = {
  name: syntheticsSnippetObjectTypeName,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
      },
      label: {
        type: 'keyword',
      },
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
            When adding new fields please add them here. If they need to be searchable put them in the uncommented
            part of properties.
            detail: {
              type: 'text',
            },
            insertText: {
              type: 'text',
            },
            */
    },
  },
  management: {
    importableAndExportable: false,
    // icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.synthetics.synthetics.service.snippets', {
        defaultMessage: 'Synthetics service snippets',
      }),
  },
};

const getClientOrThrow = (server: SyntheticsServerSetup) => {
  const soClient = server.savedObjectsClient;
  if (!soClient) {
    throw new Error('Saved objects client is not available');
  }
  return soClient;
};

const getSyntheticsServiceSnippets = async (server: SyntheticsServerSetup) => {
  try {
    const soClient = getClientOrThrow(server);
    const response = await soClient.find<SyntheticsServiceSnippet>({
      type: syntheticsSnippetType.name,
    });
    return response.saved_objects.map((obj) => obj.attributes);
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return undefined;
    }
    throw getErr;
  }
};

// export const setSyntheticsServiceApiKey = async (
//   soClient: SavedObjectsClientContract,
//   apiKey: SyntheticsServiceApiKey
// ) => {
//   await soClient.create(syntheticsSnippet.name, apiKey, {
//     id: syntheticsApiKeyID,
//     overwrite: true,
//   });
// };

// const deleteSyntheticsServiceApiKey = async (soClient: SavedObjectsClientContract) => {
//   try {
//     return await soClient.delete(syntheticsSnippet.name, syntheticsApiKeyID);
//   } catch (e) {
//     throw e;
//   }
// };

export const syntheticsServiceSnippetsSavedObject = {
  get: getSyntheticsServiceSnippets,
  //   set: setSyntheticsServiceApiKey,
  //   delete: deleteSyntheticsServiceApiKey,
};
