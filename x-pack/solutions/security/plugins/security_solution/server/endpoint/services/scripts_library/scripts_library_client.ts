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
  SavedObjectsFindOptions,
} from '@kbn/core/server';
import { v4 as uuidV4 } from 'uuid';
import assert from 'assert';
import type { KueryNode } from '@kbn/es-query';
import * as esKuery from '@kbn/es-query';
import { KUERY_FIELD_TO_SO_FIELD_MAP } from '../../../../common/endpoint/service/scripts_library';
import type { ListScriptsRequestQuery } from '../../../../common/api/endpoint/scripts_library/list_scripts';
import {
  ENDPOINT_DEFAULT_PAGE_SIZE,
  SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type { HapiReadableStream } from '../../../types';
import {
  SCRIPTS_LIBRARY_FILE_DATA_INDEX_NAME,
  SCRIPTS_LIBRARY_FILE_METADATA_INDEX_NAME,
  SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
} from '../../lib/scripts_library';
import { ScriptLibraryError } from './common';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { CreateScriptRequestBody } from '../../../../common/api/endpoint/scripts_library';
import type {
  EndpointScript,
  EndpointScriptListApiResponse,
} from '../../../../common/endpoint/types';
import type {
  ScriptDownloadResponse,
  ScriptsLibraryClientInterface,
  ScriptsLibrarySavedObjectAttributes,
} from './types';
import { catchAndWrapError, wrapErrorIfNeeded } from '../../utils';
import { stringify } from '../../utils/stringify';

export interface ScriptsLibraryClientOptions {
  spaceId: string;
  username: string;
  endpointService: EndpointAppContextService;
  // FIXME:PT remove this once we have updated the privileges for kibana_system account
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
    pathToExecutable,
  }: Omit<CreateScriptRequestBody, 'file'>): ScriptsLibrarySavedObjectAttributes {
    const now = new Date().toISOString();

    return {
      name,
      platform,
      description,
      instructions,
      example,
      id: '',
      file_id: '',
      file_size: 0,
      file_name: '',
      file_hash_sha256: '',
      requires_input: requiresInput,
      path_to_executable: pathToExecutable,
      created_by: '',
      created_at: now,
      updated_by: '',
      updated_at: now,
    };
  }

  protected mapSoAttributesToEndpointScript({
    version = '',
    attributes: {
      id,
      name,
      platform,
      example,
      description,
      instructions,
      requires_input: requiresInput = false,
      path_to_executable: pathToExecutable = undefined,
      file_name: fileName,
      file_size: fileSize,
      file_hash_sha256: fileHash,
      created_by: createdBy,
      updated_by: updatedBy,
      created_at: createdAt,
      updated_at: updatedAt,
    },
  }: SavedObject<ScriptsLibrarySavedObjectAttributes>): EndpointScript {
    const downloadUri = SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE.replace('{script_id}', id);

    return {
      id,
      name,
      platform: platform as EndpointScript['platform'],
      fileName,
      fileSize,
      fileHash,
      downloadUri,
      requiresInput,
      description,
      instructions,
      example,
      pathToExecutable,
      createdBy,
      updatedBy,
      createdAt,
      updatedAt,
      version,
    };
  }

  protected getKueryWithPrefixedSoType(kueryString: string): KueryNode {
    const prefix = `${SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE}.attributes`;
    const kueryAst = esKuery.fromKueryExpression(kueryString);
    const kueryAstList = [kueryAst];

    this.logger.debug(
      () => `Kuery AST BEFORE prefixing with [${prefix}]: ${stringify(kueryAstList)}`
    );

    while (kueryAstList.length > 0) {
      const kueryAstNode = kueryAstList.shift();

      if (kueryAstNode) {
        switch (kueryAstNode.type) {
          case 'function':
            {
              const functionName = kueryAstNode.function;

              if (['and', 'or', 'not'].includes(functionName)) {
                kueryAstList.push(...kueryAstNode.arguments);
                break;
              }

              if (kueryAstNode.arguments && kueryAstNode.arguments.length > 0) {
                const firstArg = kueryAstNode.arguments[0];

                if (firstArg.type === 'literal' && !String(firstArg.value).startsWith(prefix)) {
                  firstArg.value = `${prefix}.${
                    KUERY_FIELD_TO_SO_FIELD_MAP[
                      firstArg.value as keyof typeof KUERY_FIELD_TO_SO_FIELD_MAP
                    ] ?? firstArg.value
                  }`;
                }
                break;
              }
            }

            break;

          // NOTE: this code may not support nested fields. Because the SO type we use for scripts
          // does not have nested fields, this should not be an issue.
        }
      }
    }

    this.logger.debug(() => `Kuery AST AFTER adding SO type: ${stringify(kueryAst)}`);

    return kueryAst;
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
        metadata: {
          name: fileStream.hapi.filename ?? scriptDefinition.name.replace(/\D\W/g, '_'),
          mime: fileStream.hapi.headers['content-type'] ?? 'application/octet-stream',
          meta: { scriptId },
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

      // attempt to delete the file record since we encountered an error during upload fo the file
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
      file_id: fileStorage.id,
      file_name: fileStorage.data.name,
      file_size: fileStorage.data.size ?? 0,
      file_hash_sha256: fileStorage.data.hash.sha256,
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

  public async list({
    page = 1,
    pageSize = ENDPOINT_DEFAULT_PAGE_SIZE,
    sortField = 'name',
    sortDirection = 'asc',
    kuery,
  }: ListScriptsRequestQuery = {}): Promise<EndpointScriptListApiResponse> {
    const filter: SavedObjectsFindOptions['filter'] = kuery
      ? this.getKueryWithPrefixedSoType(kuery)
      : undefined;

    const soFindResults = await this.soClient
      .find<ScriptsLibrarySavedObjectAttributes>({
        type: SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
        perPage: pageSize,
        page,
        filter,
        sortField:
          KUERY_FIELD_TO_SO_FIELD_MAP[sortField as keyof typeof KUERY_FIELD_TO_SO_FIELD_MAP],
        sortOrder: sortDirection,
      })
      .catch((error) => {
        // Check if the error is due to result window is too large. We currently only support up to 10k results.
        if (error.message.toLowerCase().includes('result window is too large')) {
          throw new ScriptLibraryError(
            'Result window is too large, pageSize + page must be less than or equal to: [10000]',
            400,
            error
          );
        }

        throw error;
      })
      .catch(catchAndWrapError.withMessage('Failed to search for scripts'));

    return {
      data: soFindResults.saved_objects.map(this.mapSoAttributesToEndpointScript),
      page,
      pageSize,
      sortDirection,
      sortField,
      total: soFindResults.total ?? 0,
    };
  }

  public async delete(scriptId: string): Promise<void> {
    throw new ScriptLibraryError('Not implemented', 501);
  }

  public async download(scriptId: string): Promise<ScriptDownloadResponse> {
    throw new ScriptLibraryError('Not implemented', 501);
  }
}
