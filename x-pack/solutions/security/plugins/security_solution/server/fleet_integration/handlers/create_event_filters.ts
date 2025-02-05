/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import { wrapErrorIfNeeded } from '../../endpoint/utils';
import type { PolicyCreateEventFilters } from '../types';

const PROCESS_INTERACTIVE_ECS_FIELD = 'process.entry_leader.interactive';

/**
 * Create the Event Filter list if not exists and Create Event Filters for the Elastic Defend integration.
 */
export const createEventFilters = async (
  logger: Logger,
  exceptionsClient: ExceptionListClient,
  eventFilters: PolicyCreateEventFilters,
  packagePolicy: PackagePolicy
): Promise<void> => {
  if (!eventFilters?.nonInteractiveSession) {
    return;
  }
  try {
    // Attempt to Create the Event Filter List. It won't create the list if it already exists.
    // So we can skip the validation and ignore the conflict error
    await exceptionsClient.createExceptionList({
      name: ENDPOINT_ARTIFACT_LISTS.eventFilters.name,
      namespaceType: 'agnostic',
      description: ENDPOINT_ARTIFACT_LISTS.eventFilters.description,
      listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      type: ExceptionListTypeEnum.ENDPOINT_EVENTS,
      immutable: false,
      meta: undefined,
      tags: [],
      version: 1,
    });
  } catch (err) {
    // Ignoring error 409 (Conflict)
    if (!SavedObjectsErrorHelpers.isConflictError(err)) {
      logger.error(`Error creating Event Filter List: ${wrapErrorIfNeeded(err)}`);
      return;
    }
  }

  await createNonInteractiveSessionEventFilter(logger, exceptionsClient, packagePolicy);
};

/**
 * Create an Event Filter for non-interactive sessions and attach it to the policy
 */
const createNonInteractiveSessionEventFilter = async (
  logger: Logger,
  exceptionsClient: ExceptionListClient,
  packagePolicy: PackagePolicy
): Promise<void> => {
  try {
    await exceptionsClient.createExceptionListItem({
      listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      description: i18n.translate(
        'xpack.securitySolution.fleetIntegration.elasticDefend.eventFilter.nonInteractiveSessions.description',
        {
          defaultMessage: 'Event filter for Cloud Security. Created by Elastic Defend integration.',
        }
      ),
      name: i18n.translate(
        'xpack.securitySolution.fleetIntegration.elasticDefend.eventFilter.nonInteractiveSessions.name',
        {
          defaultMessage: 'Non-interactive Sessions',
        }
      ),
      // Attach to the created policy
      tags: [`policy:${packagePolicy.id}`],
      osTypes: ['linux'],
      type: 'simple',
      namespaceType: 'agnostic',
      entries: [
        {
          field: PROCESS_INTERACTIVE_ECS_FIELD,
          operator: 'included',
          type: 'match',
          value: 'false',
        },
      ],
      itemId: uuidv4(),
      meta: undefined,
      comments: [],
      expireTime: undefined,
    });
  } catch (err) {
    logger.error(`Error creating Event Filter: ${wrapErrorIfNeeded(err)}`);
  }
};
