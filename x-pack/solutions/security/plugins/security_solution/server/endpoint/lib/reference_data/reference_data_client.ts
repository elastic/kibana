/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import type {
  ReferenceDataClientInterface,
  ReferenceDataItemKey,
  ReferenceDataSavedObject,
} from './types';
import { REFERENCE_DATA_SAVED_OBJECT_TYPE } from './constants';
import { stringify } from '../../utils/stringify';
import { catchAndWrapError, wrapErrorIfNeeded } from '../../utils';

/**
 * Data client to interact with Security Solution Reference Data (saved in saved objects).
 * Reference Data is a concept of maintaining internal known items (they have unique "key"s).
 */
export class ReferenceDataClient implements ReferenceDataClientInterface {
  constructor(
    protected readonly soClient: SavedObjectsClientContract,
    protected readonly logger: Logger
  ) {}

  public async get<TMeta extends object = {}>(
    refDataKey: ReferenceDataItemKey,
    options: Partial<{
      createIfNotFound: ReferenceDataSavedObject<TMeta>;
    }> = {}
  ): Promise<ReferenceDataSavedObject<TMeta>> {
    const soClient = this.soClient;
    const logger = this.logger;

    return soClient
      .get<ReferenceDataSavedObject<TMeta>>(REFERENCE_DATA_SAVED_OBJECT_TYPE, refDataKey)
      .then((response) => {
        logger.debug(`Retrieved [${refDataKey}]\n${stringify(response)}`);
        return response.attributes;
      })
      .catch(async (err) => {
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          if (options.createIfNotFound) {
            logger.debug(
              `Creating reference data [${refDataKey}] with: ${stringify(options.createIfNotFound)}`
            );

            return this.create<TMeta>(refDataKey, options.createIfNotFound);
          }
        }

        throw wrapErrorIfNeeded(err, `Failed to retrieve reference data item [${refDataKey}]`);
      });
  }

  public async create<TMeta extends object = {}>(
    refDataKey: ReferenceDataItemKey,
    data: ReferenceDataSavedObject<TMeta>
  ): Promise<ReferenceDataSavedObject<TMeta>> {
    const { soClient, logger } = this;

    logger.debug(`creating reference data [${refDataKey}]`);

    return soClient
      .create<ReferenceDataSavedObject<TMeta>>(REFERENCE_DATA_SAVED_OBJECT_TYPE, data, {
        id: refDataKey,
        refresh: 'wait_for',
      })
      .then((response) => {
        logger.debug(`Reference data item [${refDataKey}] created successfully`);
        return response.attributes;
      })
      .catch((error) => {
        if (SavedObjectsErrorHelpers.isConflictError(error)) {
          logger.debug(`Looks like reference data [${refDataKey}] already exists - return it`);

          return this.get<TMeta>(refDataKey);
        }

        return catchAndWrapError(error);
      });
  }

  public async update<TMeta extends object = {}>(
    refDataKey: ReferenceDataItemKey,
    data: ReferenceDataSavedObject<TMeta>
  ): Promise<ReferenceDataSavedObject<TMeta>> {
    const { soClient, logger } = this;

    logger.debug(`updating reference data [${refDataKey}]`);

    await soClient
      .update<ReferenceDataSavedObject<TMeta>>(REFERENCE_DATA_SAVED_OBJECT_TYPE, refDataKey, data, {
        refresh: 'wait_for',
      })
      .catch(catchAndWrapError);

    return data;
  }

  public async delete(refDataKey: ReferenceDataItemKey): Promise<void> {
    const { soClient, logger } = this;

    logger.debug(`Deleting reference data [${refDataKey}]`);

    await soClient.delete(REFERENCE_DATA_SAVED_OBJECT_TYPE, refDataKey).catch(catchAndWrapError);
  }
}
