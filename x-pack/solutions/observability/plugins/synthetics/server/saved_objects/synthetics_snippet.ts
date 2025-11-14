/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsType, Logger } from '@kbn/core/server';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  SyntheticsServiceSnippetType,
  SyntheticsServiceSnippetWithIdType,
} from '../../common/runtime_types/synthetics_service_snippet';

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

export class SyntheticsSnippetsService {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  async getSnippets(): Promise<SyntheticsServiceSnippetWithIdType[]> {
    try {
      const response = await this.soClient.find<SyntheticsServiceSnippetType>({
        type: syntheticsSnippetType.name,
      });
      return response.saved_objects.map((obj) => this.mapSnippetToApiType(obj));
    } catch (getErr) {
      this.logger.error(`Error fetching synthetics snippets ${getErr}`);
      throw getErr;
    }
  }

  async addSnippet(syntheticsSnippet: SyntheticsServiceSnippetType) {
    try {
      const createdSnippet = await this.soClient.create(
        syntheticsSnippetType.name,
        syntheticsSnippet
      );
      return {
        snippet: this.mapSnippetToApiType(createdSnippet),
      };
    } catch (error) {
      this.logger.error(`Error creating synthetics snippet ${error}`);
      throw error;
    }
  }

  async deleteSnippet(snippetId: string): Promise<void> {
    try {
      await this.soClient.delete(syntheticsSnippetType.name, snippetId);
    } catch (error) {
      this.logger.error(`Error deleting synthetics snippet with id ${snippetId}: ${error}`);
      throw error;
    }
  }

  mapSnippetToApiType(
    snippetSavedObject: SavedObject<SyntheticsServiceSnippetType>
  ): SyntheticsServiceSnippetWithIdType {
    return {
      ...snippetSavedObject.attributes,
      id: snippetSavedObject.id,
    };
  }
}
