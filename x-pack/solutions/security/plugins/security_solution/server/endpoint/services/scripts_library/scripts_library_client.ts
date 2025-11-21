/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileClient } from '@kbn/files-plugin/server';
import { createFileHashTransform, createEsFileClient } from '@kbn/files-plugin/server';
import type {
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
  SavedObject,
} from '@kbn/core/server';
import { v4 as uuidV4 } from 'uuid';
import assert from 'assert';
import { SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import type { HapiReadableStream } from '../../../types';
import type { ScriptsLibrarySavedObjectAttributes } from '../../lib/scripts_library';
import {
  SCRIPTS_LIBRARY_FILE_DATA_INDEX_NAME,
  SCRIPTS_LIBRARY_FILE_METADATA_INDEX_NAME,
  SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
} from '../../lib/scripts_library';
import { ScriptLibraryError } from './common';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { CreateScriptRequestBody } from '../../../../common/api/endpoint/scripts_library';
import type { EndpointScript } from '../../../../common/endpoint/types';
import type { ScriptDownloadResponse, ScriptsLibraryClientInterface } from './types';
import { wrapErrorIfNeeded } from '../../utils';
import { stringify } from '../../utils/stringify';

export interface ScriptsLibraryClientOptions {
  spaceId: string;
  username: string;
  endpointService: EndpointAppContextService;
  // FIXME:PT remove this once we have updatd the privileges for kibana_system account
  esClient?: ElasticsearchClient;
}

export class ScriptsLibraryClient implements ScriptsLibraryClientInterface {
  protected readonly filesClient: FileClient;
  protected readonly logger: Logger;
  protected readonly esClient: ElasticsearchClient;
  protected readonly soClient: SavedObjectsClientContract;
  protected readonly username: string;

  constructor(options: ScriptsLibraryClientOptions) {
    this.logger = options.endpointService.createLogger('ScriptsLibraryClient');
    this.username = options.username;
    this.esClient = options.esClient || options.endpointService.getInternalEsClient();
    this.soClient = options.endpointService.savedObjects.createInternalScopedSoClient({
      spaceId: options.spaceId,
      readonly: false,
    });
    this.filesClient = createEsFileClient({
      metadataIndex: SCRIPTS_LIBRARY_FILE_METADATA_INDEX_NAME,
      blobStorageIndex: SCRIPTS_LIBRARY_FILE_DATA_INDEX_NAME,
      elasticsearchClient: this.esClient,
      logger: this.logger,
      maxSizeBytes: options.endpointService.getServerConfigValue('maxEndpointScriptFileSize'),
    });
  }

  protected mapToSavedObjectProperties({
    name,
    platform,
    example,
    description,
    instructions,
    requiresInput,
    executable,
  }: Omit<CreateScriptRequestBody, 'file'>): ScriptsLibrarySavedObjectAttributes {
    return {
      id: '',
      hash: '',
      name,
      platform,
      requires_input: requiresInput,
      description,
      instructions,
      example,
      executable,
      created_by: '',
      updated_by: '',
    };
  }

  protected mapSoAttributesToEndpointScript({
    created_at: createdAt = '',
    updated_at: updatedAt = '',
    version = '',
    attributes: {
      id,
      name,
      platform,
      example,
      description,
      instructions,
      requires_input: requiresInput = false,
      executable,
      created_by: createdBy,
      updated_by: updatedBy,
    },
  }: SavedObject<ScriptsLibrarySavedObjectAttributes>): EndpointScript {
    const downloadUri = SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE.replace('{script_id}', id);

    return {
      id,
      name,
      platform: platform as EndpointScript['platform'],
      downloadUri,
      requiresInput,
      description,
      instructions,
      example,
      executable,
      createdBy,
      updatedBy,
      createdAt,
      updatedAt,
      version,
    };
  }

  public async create({
    file: _file,
    ...scriptDefinition
  }: CreateScriptRequestBody): Promise<EndpointScript> {
    const logger = this.logger.get('create');
    const scriptId = uuidV4();
    const fileStream = _file as HapiReadableStream;

    const fileStorage = await this.filesClient
      .create({
        id: scriptId,
        metadata: {
          name: fileStream.hapi.filename ?? scriptDefinition.name.replace(/\D\W/g, '_'),
          mime: fileStream.hapi.headers['content-type'] ?? 'application/octet-stream',
        },
      })
      .catch((error) => {
        const message = `Unable to create File storage record: ${error.message}`;
        logger.error(message, { error });

        throw new ScriptLibraryError(message, 500, error);
      });

    try {
      await fileStorage.uploadContent(fileStream, undefined, {
        transforms: [createFileHashTransform()],
      });

      assert(
        fileStorage.data.hash && fileStorage.data.hash.sha256,
        new ScriptLibraryError('File hash was not generated after upload!')
      );
    } catch (error) {
      logger.error(`Error encountered while attempting to store file: ${error.message}`, {
        error,
      });

      // attempt to delete the file record since we encountered an error during uplaod fo the file
      // Best effort being done here. If it fails, then just log the error since there is nothing else we can do.
      await fileStorage.delete().catch((deleteError) => {
        logger.error(
          `Error encountered while attempting to cleanup file record: ${deleteError.message}`,
          { error: deleteError }
        );
      });

      throw wrapErrorIfNeeded(error);
    }

    // Create the script entity in the saved objects store
    const soAttributes = this.mapToSavedObjectProperties(scriptDefinition);

    Object.assign(soAttributes, {
      id: scriptId,
      hash: fileStorage.data.hash.sha256,
      created_by: this.username,
      updated_by: this.username,
    });

    try {
      logger.debug(
        () => `Creating script entity in saved objects store: ${stringify(soAttributes)}`
      );

      const scriptSo = await this.soClient.create<ScriptsLibrarySavedObjectAttributes>(
        SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
        soAttributes,
        { id: scriptId }
      );

      logger.debug(() => `Script Created:\n${stringify(scriptSo)}`);

      return this.mapSoAttributesToEndpointScript(scriptSo);
    } catch (error) {
      const message = `Attempt to create script record failed with: ${error.message}`;

      logger.error(message, { error });

      await fileStorage.delete().catch((deleteError) => {
        logger.error(
          `Error encountered while attempting to cleanup file record: ${deleteError.message}`,
          { error: deleteError }
        );
      });

      throw new ScriptLibraryError(message, 500, error);
    }
  }

  public async update(script: Partial<CreateScriptRequestBody>): Promise<EndpointScript> {
    throw new ScriptLibraryError('Not implemented', 501);
  }

  public async get(scriptId: string): Promise<EndpointScript> {
    throw new ScriptLibraryError('Not implemented', 501);
  }

  public async list(): Promise<void> {
    throw new ScriptLibraryError('Not implemented', 501);
  }

  public async delete(scriptId: string): Promise<void> {
    throw new ScriptLibraryError('Not implemented', 501);
  }

  public async download(scriptId: string): Promise<ScriptDownloadResponse> {
    throw new ScriptLibraryError('Not implemented', 501);
  }
}
