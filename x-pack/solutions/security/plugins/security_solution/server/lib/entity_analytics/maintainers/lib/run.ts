/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { asyncForEach } from '@kbn/std';
import type { EntityContainer } from '../../../../../common/api/entity_analytics/entity_store/entities/upsert_entities_bulk.gen';
import type { AfterKeys } from '../../../../../common/api/entity_analytics/common';
import type { EntityMaintainerContext } from '../entity_maintainer_client';
import { getConfiguration } from './get_configuration';
import { getRiskInputsIndex } from '../../risk_score/get_risk_inputs_index';
import { getEntitiesToProcess } from './get_entities_to_process';
import { applyMaintainerLogic } from './apply_maintainer_logic';

// circuit breaker to avoid infinite loops
const MAX_ITERATIONS = 1000;

export const isCalculationComplete = (
  result: Record<string, { afterKeys: AfterKeys; values: string[] }>
): boolean => {
  return true; // TODO implement
};

export const runTask = async (
  context: EntityMaintainerContext,
  taskInstance: ConcreteTaskInstance,
  abortController: AbortController
) => {
  try {
    const savedObjectId = taskInstance.params.savedObjectId;
    const spaceId = taskInstance.params.spaceId;

    if (!spaceId || !savedObjectId) {
      throw new Error(`Invalid task parameters: ${JSON.stringify(taskInstance.params)}`);
    }

    // Read the saved object
    const configuration = await getConfiguration(savedObjectId, spaceId);

    // Get the input index
    const { index, runtimeMappings } = await getRiskInputsIndex({
      dataViewId: configuration.input,
      logger: context.logger,
      soClient: context.savedObjectsClient,
    });

    // Get maintainer definition from registry
    if (!context.entityMaintainerRegistry.has(configuration.id)) {
      throw new Error(`No entity maintainer definition found for id: ${configuration.id}`);
    }
    const maintainerDef = context.entityMaintainerRegistry.get(configuration.id);

    if (!maintainerDef) {
      throw new Error(`No entity maintainer definition found for id: ${configuration.id}`);
    }

    // Main loop
    let numIterations = 0;
    const afterKeys: AfterKeys = {};

    while (true) {
      if (numIterations >= MAX_ITERATIONS) {
        context.logger.warn(
          `Max iterations of ${MAX_ITERATIONS} reached for entity maintainer ${maintainerDef.id}. Exiting loop to avoid infinite processing.`
        );
        break;
      }

      numIterations++;

      // Step 1: determine entities to process
      const entitiesToProcess = await getEntitiesToProcess({
        afterKeys,
        abortController,
        esClient: context.esClient,
        index,
        logger: context.logger,
        maintainerConfig: configuration,
        maintainerDef,
        runtimeMappings,
      });

      // Step 2: apply entity maintainer logic for each supported entity type (perform ES|QL query from definition)
      const allEntities: EntityContainer[] = [];
      asyncForEach(maintainerDef.entityTypes, async (entityType) => {
        if (entitiesToProcess[entityType].values.length > 0) {
          // we have entities to process!
          const entities = await applyMaintainerLogic({
            abortController,
            esClient: context.esClient,
            index,
            entityType,
            logger: context.logger,
            lowerBounds: afterKeys[entityType],
            upperBounds: entitiesToProcess[entityType].afterKey,
            maintainerDef,
            maintainerConfig: configuration,
          });

          allEntities.push(...entities);
        } else {
          context.logger.info(
            `No entities to process for entity type ${entityType} in maintainer ${maintainerDef.id}`
          );
        }
      });

      // Step 3: apply post-processing logic if applicable (from definition)
      if (maintainerDef.postProcessRecords) {
        maintainerDef.postProcessRecords(allEntities);
      }

      // Step 4: update entity store using bulk API
      await context.entityStoreCrudClient.upsertEntitiesBulk(allEntities, false);

      // Check if we're done
      if (isCalculationComplete(entitiesToProcess) || abortController.signal.aborted) {
        break;
      }

      // Update after keys for pagination
      // TODO
    }
  } catch (err) {
    context.logger.error(`Error encountered while running entity maintainer task: ${err.message}`, {
      error: { stack_trace: err.stack },
    });
  }
};
