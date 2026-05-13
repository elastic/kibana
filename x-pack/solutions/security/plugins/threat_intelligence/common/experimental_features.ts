/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allowed experimental feature flags. Keys here can be enabled at runtime via
 * `xpack.threatIntelligence.enableExperimental: ["<key>"]`.
 */
export const allowedExperimentalValues = {
  threatIntelligenceSkillEnabled: false,
  /**
   * Schedules the IOC indicator-sync Task Manager job that mirrors
   * `extracted.iocs` from `.kibana-threat-reports-*` into the
   * `.kibana-threat-intel-indicators` companion index. Off by default so
   * customers opt in explicitly — once on, Indicator Match rules can point
   * at the index without further plumbing (the operator must additionally
   * grant their detection-rule role read on `.kibana-threat-intel-indicators`,
   * since it lives under `.kibana-*`).
   */
  iocIndicatorSyncEnabled: false,
} as const;

export type ExperimentalFeatures = {
  -readonly [K in keyof typeof allowedExperimentalValues]: boolean;
};

type AllowedExperimentalKey = keyof typeof allowedExperimentalValues;

const isValidKey = (key: string): key is AllowedExperimentalKey => {
  return Object.hasOwn(allowedExperimentalValues, key);
};

export const parseExperimentalConfigValue = (
  configValue: readonly string[]
): { features: ExperimentalFeatures; invalid: string[] } => {
  const features = (Object.keys(allowedExperimentalValues) as AllowedExperimentalKey[]).reduce(
    (acc, key) => {
      acc[key] = allowedExperimentalValues[key];
      return acc;
    },
    {} as ExperimentalFeatures
  );
  const invalid: string[] = [];

  for (const value of configValue) {
    if (isValidKey(value)) {
      features[value] = true;
    } else {
      invalid.push(value);
    }
  }

  return { features, invalid };
};
