/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  COMMUNITY_LIBRARY_ID,
  ELASTIC_LIBRARY_ID,
  RULE_LIBRARY_DEFINITIONS,
  RULE_LIBRARY_SO_TYPE,
  syncRuleLibraries,
  type LibraryEnsureResult,
} from '@kbn/security-rule-libraries';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import { findLatestPackageVersion } from './find_latest_package_version';
import { ensureInstalledPackage } from './ensure_installed_package';

/**
 * Installs the prebuilt rules package of the config's specified or latest version.
 *
 * @param config Kibana config
 * @param context Request handler context
 */
interface PrebuiltRulesInstallResult {
  status: string;
  package: { name: string; version: string };
}

export async function installPrebuiltRulesPackage(
  context: SecuritySolutionApiRequestHandlerContext,
  logger: Logger
): Promise<PrebuiltRulesInstallResult> {
  const config = context.getConfig();

  if (config.experimentalFeatures.ruleLibrariesEnabled) {
    return syncLibraries(context, logger);
  }

  let pkgVersion = config.prebuiltRulesPackageVersion;

  if (!pkgVersion) {
    logger.debug(`installPrebuiltRulesPackage: no package version specified in config.`);
    pkgVersion = await findLatestPackageVersion(context, PREBUILT_RULES_PACKAGE_NAME, logger);
  } else {
    logger.debug(`installPrebuiltRulesPackage: package version specified in config: ${pkgVersion}`);
  }

  return ensureInstalledPackage(context, PREBUILT_RULES_PACKAGE_NAME, pkgVersion, logger);
}

async function syncLibraries(
  context: SecuritySolutionApiRequestHandlerContext,
  logger: Logger
): Promise<LibraryEnsureResult> {
  const client = context.core.savedObjects.getClient({
    includedHiddenTypes: [RULE_LIBRARY_SO_TYPE],
  });
  const packages = context.getInternalFleetServices().packages;
  const pinned = context.getConfig().prebuiltRulesPackageVersion;

  const definitions = RULE_LIBRARY_DEFINITIONS.map((definition) =>
    definition.id === ELASTIC_LIBRARY_ID && pinned
      ? { ...definition, pinned_version: pinned }
      : definition
  );

  const { elastic, results } = await syncRuleLibraries({
    client,
    packages,
    logger,
    definitions,
    // Local testing only: the community library comes from github, so it should not be synced at app load.
    libraryIds: [ELASTIC_LIBRARY_ID, COMMUNITY_LIBRARY_ID],
  });

  for (const result of results) {
    if (result.outcome === 'failed') {
      logger.error(`Rule library "${result.id}" failed: ${result.error}`);
    }
  }

  if (!elastic) {
    const failed = results.find((r) => r.id === ELASTIC_LIBRARY_ID);
    throw new Error(failed?.error ?? 'Elastic rule library sync failed');
  }

  return elastic;
}
