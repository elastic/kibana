/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_AI_PROMPTS_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { findLatestPackageVersion } from './find_latest_package_version';
import type { ConfigType } from '../../../../../config';
export async function installSecurityAiPromptsPackage(
  config: ConfigType,
  context: SecuritySolutionApiRequestHandlerContext
) {
  try {
    let pkgVersion = config.prebuiltRulesPackageVersion;

    if (!pkgVersion) {
      // Find latest package if the version isn't specified in the config
      pkgVersion = await findLatestPackageVersion(context, SECURITY_AI_PROMPTS_PACKAGE_NAME);
    }
    return context.getInternalFleetServices().packages.ensureInstalledPackage({
      pkgName: SECURITY_AI_PROMPTS_PACKAGE_NAME,
      pkgVersion,
    });
  } catch (e) {
    // fail silently
    return null;
  }
}
