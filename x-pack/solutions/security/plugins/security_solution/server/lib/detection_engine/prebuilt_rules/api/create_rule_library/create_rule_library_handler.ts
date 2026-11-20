/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RULE_LIBRARY_SO_TYPE } from '@kbn/security-rule-libraries';
import type { RuleLibraryAttributes } from '@kbn/security-rule-libraries';
import type {
  CreateRuleLibraryRequestBody,
  CreateRuleLibraryResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { getLibraryTitleFromUrl } from '../../logic/rule_libraries/library_title_from_url';
import { toLibraryAttributes } from '../../logic/rule_libraries/to_library_attributes';

export const createRuleLibraryHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, CreateRuleLibraryRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<CreateRuleLibraryResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const { secret, scope, pinned_version: pinnedVersion } = request.body;

  try {
    const ctx = await context.resolve(['core', 'securitySolution']);

    // Without an encryption key a secret cannot be stored, and saving it would fail with a less clear error.
    if (secret && !ctx.securitySolution.getEncryptedSavedObjectsClient()) {
      return siemResponse.error({
        statusCode: 400,
        body: 'Credentials cannot be stored because encrypted saved objects are not configured',
      });
    }

    const id = uuidv4();
    const title = getLibraryTitleFromUrl(request.body.provider.url);
    const attributes: RuleLibraryAttributes = {
      name: id,
      // Replaced by the title in the library's manifest when it is first refreshed.
      title,
      provider: toLibraryAttributes(request.body),
      ...(secret ? { secret } : {}),
      ...(pinnedVersion ? { pinned_version: pinnedVersion } : {}),
      ...(scope === 'space' ? { space_id: ctx.securitySolution.getSpaceId() } : {}),
    };

    await ctx.core.savedObjects
      .getClient({ includedHiddenTypes: [RULE_LIBRARY_SO_TYPE] })
      .create<RuleLibraryAttributes>(RULE_LIBRARY_SO_TYPE, attributes, { id });

    return response.ok({ body: { id } });
  } catch (err) {
    logger.error(`createRuleLibraryHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
