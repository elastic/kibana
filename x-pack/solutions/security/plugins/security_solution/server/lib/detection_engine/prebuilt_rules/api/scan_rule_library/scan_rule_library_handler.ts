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
import { GitProvider, S3Provider, scanLibrary } from '@kbn/security-rule-libraries';
import type {
  ScanRuleLibraryRequestBody,
  ScanRuleLibraryResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { toLibraryAttributes } from '../../logic/rule_libraries/to_library_attributes';

const MAX_ERROR_LENGTH = 300;

export const scanRuleLibraryHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, ScanRuleLibraryRequestBody>,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<ScanRuleLibraryResponseBody>> => {
  const siemResponse = buildSiemResponse(response);
  const connection = request.body;

  try {
    const provider =
      connection.provider.type === 'git' ? new GitProvider({ logger }) : new S3Provider({ logger });

    try {
      const { version, ruleCount, manifest, manifestError } = await scanLibrary({
        provider,
        library: {
          name: 'scan',
          title: 'scan',
          provider: toLibraryAttributes(connection),
          secret: connection.secret,
        },
        pinnedVersion: connection.pinned_version,
      });

      return response.ok({
        body: {
          success: true,
          version,
          rule_count: ruleCount,
          ...(manifest ? { manifest } : {}),
          ...(manifestError ? { manifest_error: manifestError } : {}),
        },
      });
    } catch (scanError) {
      // A library that cannot be reached is an answer to the scan, not a failure of the route.
      logger.debug(`scanRuleLibraryHandler: scan failed: ${scanError}`);
      const message = scanError instanceof Error ? scanError.message : String(scanError);
      return response.ok({
        body: { success: false, error: message.slice(0, MAX_ERROR_LENGTH) },
      });
    }
  } catch (err) {
    logger.error(`scanRuleLibraryHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
