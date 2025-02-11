/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GetPrebuiltRulesStatusResponseBody {
  /** Aggregated info about all prebuilt rules */
  stats: PrebuiltRulesStatusStats;
}

export interface PrebuiltRulesStatusStats {
  /** Number of installed prebuilt rules */
  num_prebuilt_rules_installed: number;

  /** Number of prebuilt rules available for installation (not yet installed) */
  num_prebuilt_rules_to_install: number;

  /** Number of installed prebuilt rules available for upgrade (stock + customized) */
  num_prebuilt_rules_to_upgrade: number;

  /** Total number of prebuilt rules available in package (including already installed) */
  num_prebuilt_rules_total_in_package: number;

  // In the future we could add more stats such as:
  // - number of installed prebuilt rules which were deprecated
  // - number of installed prebuilt rules which are not compatible with the current version of Kibana
}
