/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExcludedLoggingPath } from '../logging/path_policy';

/** File extensions treated as executable production source for OTel extraction. */
const productionSourceExtension: RegExp =
  /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|kts|scala|cs|rb|php|c|cc|cpp|cxx|h)$/i;
/** Configuration names that can declare OTel resource or exporter instrumentation. */
const otelConfigurationFile: RegExp =
  /(?:otel|opentelemetry).*(?:\.ya?ml|\.json|\.toml|\.properties)$/i;
/** Extra directories and lock files that must never become OTel source evidence. */
const excludedOtelPath: RegExp =
  /(?:^|\/)(?:docs?|examples?|vendor|dist|build|generated)(?:\/|$)|(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|cargo\.lock)$/i;

/** Returns whether a repository path is production source or OTel configuration eligible for extraction. */
export const isProductionOtelPath = (path: string): boolean =>
  !isExcludedLoggingPath(path) &&
  !excludedOtelPath.test(path) &&
  (productionSourceExtension.test(path) || otelConfigurationFile.test(path));
