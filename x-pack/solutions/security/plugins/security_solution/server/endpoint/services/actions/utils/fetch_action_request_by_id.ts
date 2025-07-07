/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALLOWED_ACTION_REQUEST_TAGS } from '../constants';
import { stringify } from '../../../utils/stringify';
import { NotFoundError } from '../../../errors';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import type {
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointAction,
} from '../../../../../common/endpoint/types';
import { catchAndWrapError } from '../../../utils';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
import type { OrphanResponseActionsMetadata } from '../../../lib/reference_data';
import { REF_DATA_KEYS } from '../../../lib/reference_data';

/**
 * Fetches a single Action request document.
 * @param endpointService
 * @param spaceId
 * @param actionId
 * @throws
 */
export const fetchActionRequestById = async <
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TMeta extends {} = {}
>(
  endpointService: EndpointAppContextService,
  spaceId: string,
  actionId: string,
  {
    bypassSpaceValidation = false,
  }: Partial<{
    /**
     * if `true`, then no space validations will be done on the action retrieved. Default is `false`.
     * USE IT CAREFULLY!
     */
    bypassSpaceValidation: boolean;
  }> = {}
): Promise<LogsEndpointAction<TParameters, TOutputContent, TMeta>> => {
  const logger = endpointService.createLogger('fetchActionRequestById');
  const searchResponse = await endpointService
    .getInternalEsClient()
    .search<LogsEndpointAction<TParameters, TOutputContent, TMeta>>(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        query: { bool: { filter: [{ term: { action_id: actionId } }] } },
        size: 1,
      },
      { ignore: [404] }
    )
    .catch(catchAndWrapError);

  const actionRequest = searchResponse.hits.hits?.[0]?._source;

  if (!actionRequest) {
    throw new NotFoundError(`Action with id '${actionId}' not found.`);
  } else if (
    endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled &&
    !bypassSpaceValidation
  ) {
    if (!actionRequest.agent.policy || actionRequest.agent.policy.length === 0) {
      const message = `Response action [${actionId}] missing 'agent.policy' information - unable to determine if response action is accessible for space [${spaceId}]`;

      logger.warn(message);
      logger.debug(`Action missing policy info:\n${stringify(actionRequest)}`);

      throw new CustomHttpRequestError(message);
    } else {
      // Validate that action is visible in active space. In order for a user to be able to access
      // this response action, **at least 1** integration policy in the action request must be
      // accessible in active space
      const integrationPolicyIds = actionRequest.agent.policy.map(
        ({ integrationPolicyId }) => integrationPolicyId
      );

      try {
        await endpointService.getInternalFleetServices(spaceId).ensureInCurrentSpace({
          integrationPolicyIds,
          options: { matchAll: false },
        });
      } catch (err) {
        logger.debug(
          () =>
            `Validation of action '${actionId}' integration policies [${integrationPolicyIds.join(
              ', '
            )}] failed with: ${err.message}`
        );

        let throwNotFoundError = true;

        // Before throwing an error, lets check if the action has an "integration policy deleted" tag, and
        // if so, then check if its allowed to be shown in the active space
        if (
          actionRequest.tags &&
          actionRequest.tags.includes(ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted)
        ) {
          logger.debug(
            `Checking to see if Orphan action [${actionId}] can be displayed in space [${spaceId}]`
          );

          const orphanActionsSpaceId = (
            await endpointService
              .getReferenceDataClient()
              .get<OrphanResponseActionsMetadata>(REF_DATA_KEYS.orphanResponseActionsSpace)
          ).metadata.spaceId;

          if (orphanActionsSpaceId && orphanActionsSpaceId === spaceId) {
            logger.debug(`Action [${actionId}] can be returned for spaceId [${spaceId}]`);
            throwNotFoundError = false;
          }
        }

        if (throwNotFoundError) {
          throw new NotFoundError(`Action [${actionId}] not found`);
        }
      }
    }
  }

  // Ensure `agent.policy` is an array
  if (!Array.isArray(actionRequest.agent.policy)) {
    actionRequest.agent.policy = actionRequest.agent.policy ? [actionRequest.agent.policy] : [];
  }

  // Ensure `tags` is an array
  if (!Array.isArray(actionRequest.tags)) {
    actionRequest.tags = actionRequest.tags ? [actionRequest.tags] : [];
  }

  return actionRequest;
};
