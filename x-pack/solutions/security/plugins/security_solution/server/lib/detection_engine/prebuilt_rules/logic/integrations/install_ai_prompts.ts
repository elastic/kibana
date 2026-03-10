/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EnsurePackageResult } from '@kbn/fleet-plugin/server/services/epm/packages/install';
import { SECURITY_AI_PROMPTS_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { ensureInstalledPackage } from './ensure_installed_package';
import { findLatestPackageVersion } from './find_latest_package_version';

export async function installSecurityAiPromptsPackage(
  context: SecuritySolutionApiRequestHandlerContext,
  logger: Logger
): Promise<EnsurePackageResult | null> {
  try {
    const pkgVersion = await findLatestPackageVersion(
      context,
      SECURITY_AI_PROMPTS_PACKAGE_NAME,
      logger
    );

    return await ensureInstalledPackage(
      context,
      SECURITY_AI_PROMPTS_PACKAGE_NAME,
      pkgVersion,
      logger
    );
  } catch (error) {
    logger.error(
      'installSecurityAiPromptsPackage: Security AI prompts package failed to install',
      error
    );
    return null;
  }
}
