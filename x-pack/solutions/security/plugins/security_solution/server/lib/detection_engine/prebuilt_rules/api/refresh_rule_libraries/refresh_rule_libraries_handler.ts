/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  RULE_LIBRARY_SO_TYPE,
  ensureLibraries,
  refreshRuleLibraries,
} from '@kbn/security-rule-libraries';
import type { RuleLibraryAttributes } from '@kbn/security-rule-libraries';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  RefreshRuleLibrariesRequestBody,
  RefreshRuleLibrariesResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { findVisibleRuleLibraries } from '../../logic/rule_libraries/find_visible_rule_libraries';

// A secret that cannot be decrypted, for example after the encryption key changed, is left out. The refresh
// then fails for that library with the error of the host, and the other libraries still refresh.
const readLibrarySecret = async (
  encryptedClient: EncryptedSavedObjectsClient,
  id: string,
  logger: Logger
): Promise<string | undefined> => {
  try {
    const { attributes } = await encryptedClient.getDecryptedAsInternalUser<RuleLibraryAttributes>(
      RULE_LIBRARY_SO_TYPE,
      id
    );
    return attributes.secret;
  } catch (error) {
    logger.warn(`The secret of rule library "${id}" could not be read: ${error}`);
    return undefined;
  }
};

export const refreshRuleLibrariesHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, RefreshRuleLibrariesRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<RefreshRuleLibrariesResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const libraryIds = request.body?.library_ids;

  try {
    const ctx = await context.resolve(['core', 'securitySolution']);
    const client = ctx.core.savedObjects.getClient({
      includedHiddenTypes: [RULE_LIBRARY_SO_TYPE],
    });

    // The built-in libraries are created on demand, so they have to exist before they can be looked up.
    await ensureLibraries({ client, logger });
    const visibleLibraryIds = (
      await findVisibleRuleLibraries(client, ctx.securitySolution.getSpaceId())
    ).map(({ id }) => id);

    const unknownId = libraryIds?.find((libraryId) => !visibleLibraryIds.includes(libraryId));
    if (unknownId) {
      return siemResponse.error({
        statusCode: 404,
        body: `Rule library "${unknownId}" not found`,
      });
    }

    const { packages } = ctx.securitySolution.getInternalFleetServices();
    const encryptedClient = ctx.securitySolution.getEncryptedSavedObjectsClient();

    const { results } = await refreshRuleLibraries({
      client,
      packages,
      logger,
      libraryIds: libraryIds ?? visibleLibraryIds,
      getSecret: encryptedClient
        ? (id) => readLibrarySecret(encryptedClient, id, logger)
        : undefined,
    });

    return response.ok({ body: { results } });
  } catch (err) {
    logger.error(`refreshRuleLibrariesHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
