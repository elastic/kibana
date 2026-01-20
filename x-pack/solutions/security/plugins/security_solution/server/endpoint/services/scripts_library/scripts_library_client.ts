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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { v4 as uuidV4 } from 'uuid';
import assert from 'assert';
import type { KueryNode } from '@kbn/es-query';
import * as esKuery from '@kbn/es-query';
import type { File } from '@kbn/files-plugin/common';
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
  ScriptUpdateParams,
} from './types';
import { catchAndWrapError, wrapErrorIfNeeded } from '../../utils';
import { stringify } from '../../utils/stringify';

export interface ScriptsLibraryClientOptions {
  spaceId: string;
  username: string;
  endpointService: EndpointAppContextService;
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
    this.esClient = options.endpointService.getInternalEsClient();
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
    tags,
  }: Omit<CreateScriptRequestBody, 'file'>): ScriptsLibrarySavedObjectAttributes {
    const now = new Date().toISOString();

    return {
      name,
      platform,
      description,
      instructions,
      example,
      tags,
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
      tags = [],
      file_id: fileId,
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
      fileId,
      fileName,
      fileSize,
      fileHash,
      downloadUri,
      requiresInput,
      description,
      instructions,
      example,
      pathToExecutable,
      tags: tags as EndpointScript['tags'],
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

  protected getScriptSavedObject(
    scriptId: string
  ): Promise<SavedObject<ScriptsLibrarySavedObjectAttributes>> {
    return this.soClient
      .get<ScriptsLibrarySavedObjectAttributes>(SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE, scriptId)
      .catch((error) => {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          throw new ScriptLibraryError(`Script with id ${scriptId} not found`, 404, error);
        }

        throw new ScriptLibraryError(`Failed to retrieve script with id: ${scriptId}`, 500, error);
      });
  }

  /**
   * Uploads a new file to the file storage and returns its instance
   * @protected
   */
  protected async storeFile({
    scriptId,
    file,
    fileName = '',
  }: {
    scriptId: string;
    file: HapiReadableStream;
    /** The file name. By Default, an attempt will be made to get it from the File stream unless this option is set. */
    fileName?: string;
  }): Promise<File> {
    const fileStorage = await this.filesClient
      .create({
        metadata: {
          name: fileName || (file.hapi.filename ?? 'script_file'),
          mime: file.hapi.headers['content-type'] ?? 'application/octet-stream',
          meta: { scriptId },
        },
      })
      .catch((error) => {
        const message = `Unable to create File storage record: ${error.message}`;
        this.logger.error(message, { error });

        throw new ScriptLibraryError(message, 500, error);
      });

    try {
      await fileStorage.uploadContent(file, undefined, {
        transforms: [createFileHashTransform()],
      });

      assert(
        fileStorage.data.hash && fileStorage.data.hash.sha256,
        new ScriptLibraryError('File hash was not generated after upload!')
      );

      // Now that we have a Hash, check to ensure that file has not been uploaded before
      const existingScriptWithSameFile =
        await this.soClient.find<ScriptsLibrarySavedObjectAttributes>({
          type: SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
          filter: this.getKueryWithPrefixedSoType(
            `file_hash_sha256:"${fileStorage.data.hash.sha256}" AND NOT id:"${scriptId}"`
          ),
          perPage: 1,
        });

      if (existingScriptWithSameFile.saved_objects.length > 0) {
        throw new ScriptLibraryError(
          `The file you are attempting to upload (hash: [${fileStorage.data.hash.sha256}]) already exists and is associated with a script entry named [${existingScriptWithSameFile.saved_objects[0].attributes.name}] (script ID: [${existingScriptWithSameFile.saved_objects[0].id}])`,
          400
        );
      }
    } catch (error) {
      this.logger.error(`Error encountered while attempting to store file: ${error.message}`, {
        error,
      });

      // attempt to delete the file record since we encountered an error during upload fo the file
      // Best effort being done here. If it fails, then just log the error since there is nothing else we can do.
      await fileStorage.delete().catch((deleteError) => {
        this.logger.error(
          `Error encountered while attempting to cleanup file record: ${deleteError.message}`,
          { error: deleteError }
        );
      });

      throw wrapErrorIfNeeded(error);
    }

    return fileStorage;
  }

  public async create({
    file: _file,
    ...scriptDefinition
  }: CreateScriptRequestBody): Promise<EndpointScript> {
    const logger = this.logger.get('create');
    const scriptId = uuidV4();
    const fileStream = _file as HapiReadableStream;
    const soAttributes = this.mapToSavedObjectProperties(scriptDefinition);
    const fileStorage = await this.storeFile({ scriptId, file: fileStream });

    Object.assign(soAttributes, {
      id: scriptId,
      file_id: fileStorage.id,
      file_name: fileStorage.data.name,
      file_size: fileStorage.data.size ?? 0,
      // @ts-expect-error: TS18048: fileStorage.data.hash is possibly undefined - `.storeFile()` already ensure we have data.hash
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

  public async update({
    id,
    version,
    file,
    ...scriptUpdates
  }: ScriptUpdateParams): Promise<EndpointScript> {
    const currentScriptSoItem = await this.getScriptSavedObject(id);
    let newFileStorage: File | undefined;

    // Although this check would be automatically done by the saved objects functionality, we are
    // doing it manually here so that if a `file` upload was provided, we don't spend time
    // uploading it just to then turn around and have to delete it when the SO update fails.
    if (version && currentScriptSoItem.version !== version) {
      throw new ScriptLibraryError(
        `Script with id ${id} has a different version than the one provided in the request. Current version: ${currentScriptSoItem.version}, provided version: ${version}`,
        409
      );
    }

    if (file) {
      newFileStorage = await this.storeFile({ scriptId: id, file: file as HapiReadableStream });

      this.logger.debug(
        () =>
          `New file for Script id ${id} uploaded successfully: ${stringify(newFileStorage?.data)}`
      );
    }

    try {
      const soUpdate = Object.entries(scriptUpdates).reduce((acc, [fieldName, value]) => {
        const soFieldName = (KUERY_FIELD_TO_SO_FIELD_MAP[
          fieldName as keyof typeof KUERY_FIELD_TO_SO_FIELD_MAP
        ] ?? fieldName) as keyof ScriptsLibrarySavedObjectAttributes;

        // @ts-expect-error: TS2322 - caused by the fact that `scriptUpdates` is a subset of fields
        acc[soFieldName] = value;

        return acc;
      }, {} as Partial<ScriptsLibrarySavedObjectAttributes>);

      soUpdate.updated_by = this.username;
      soUpdate.updated_at = new Date().toISOString();

      // If a new file was uploaded, then update SO entry with its info.
      if (newFileStorage) {
        soUpdate.file_id = newFileStorage.id;
        soUpdate.file_name = newFileStorage.data.name;
        soUpdate.file_size = newFileStorage.data.size ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        soUpdate.file_hash_sha256 = newFileStorage.data.hash!.sha256;
      }

      this.logger.debug(() => `Updating script id ${id} with:\n${stringify(soUpdate)}`);

      await this.soClient
        .update<ScriptsLibrarySavedObjectAttributes>(
          SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
          id,
          soUpdate,
          { version }
        )
        .catch(catchAndWrapError.withMessage(`Failed to update script with id: ${id}`));
    } catch (error) {
      // If a new file was uploaded, then delete it now since the update failed
      if (newFileStorage) {
        await newFileStorage.delete().catch((deleteError) => {
          this.logger.error(
            `Error encountered while attempting to delete (cleanup) new file [${newFileStorage.id}] upload for Script [${id}]: ${deleteError.message}. File is now orphaned!`,
            { error: deleteError }
          );
        });
      }

      throw wrapErrorIfNeeded(error);
    }

    // If a new file was uploaded, then delete the old one
    if (newFileStorage) {
      this.logger.debug(
        `Update to script [${id}] with new file upload info successful. Deleting old file id [${currentScriptSoItem.attributes.file_id}]`
      );

      this.filesClient
        .delete({ id: currentScriptSoItem.attributes.file_id })
        .catch((deleteError) => {
          this.logger.error(
            `Error encountered while attempting to delete old file [${currentScriptSoItem.attributes.file_id}] for script [${id}]: ${deleteError.message}. File is now orphaned!`,
            { error: deleteError }
          );
        });
    }

    return this.mapSoAttributesToEndpointScript(await this.getScriptSavedObject(id));
  }

  public async get(scriptId: string): Promise<EndpointScript> {
    return this.mapSoAttributesToEndpointScript(await this.getScriptSavedObject(scriptId));
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
    const scriptSo = await this.getScriptSavedObject(scriptId);

    await this.soClient
      .delete(SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE, scriptId)
      .catch(catchAndWrapError.withMessage(`Failed to delete script with id: ${scriptId}`));

    try {
      await this.filesClient.delete({ id: scriptSo.attributes.file_id }).catch(catchAndWrapError);
    } catch (error) {
      this.logger.error(
        `Failed to delete file [${scriptSo.attributes.file_id}] for script [${scriptId}].File is now orphaned. ${error.message}`,
        { error }
      );
    }
  }

  public async download(scriptId: string): Promise<ScriptDownloadResponse> {
    const scriptSo = await this.getScriptSavedObject(scriptId);

    const file = await this.filesClient
      .get({ id: scriptSo.attributes.file_id })
      .catch(
        catchAndWrapError.withMessage(
          `Failed to initialize File instance for file id [${scriptSo.attributes.file_id}] of script [${scriptId}]`
        )
      );

    return {
      stream: await file
        .downloadContent()
        .catch(
          catchAndWrapError.withMessage(
            `Failed to download file content for file id [${scriptSo.attributes.file_id}] of script [${scriptId}]`
          )
        ),
      fileName: scriptSo.attributes.file_name,
      mimeType: file.data.mimeType,
    };
  }
}
