/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CSPUIConfigType {
  enableExperimental: string[];
}

export type ExperimentalFeatures = { [K in keyof typeof allowedExperimentalValues]: boolean };

/**
 * A list of allowed values that can be used in `xpack.cloudSecurityPosture.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  /**
   *  Enables cloud Connectors  for Cloud Security Posture
   */
  cloudConnectorsEnabled: false,
});

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

/**
 * Parses the string value used in `xpack.cloudSecurityPosture.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 *
 * @param configValue
 * @throws SecuritySolutionInvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (
  configValue: string[]
): { features: ExperimentalFeatures; invalid: string[] } => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};
  const invalidKeys: string[] = [];

  for (const value of configValue) {
    if (!allowedKeys.includes(value as keyof ExperimentalFeatures)) {
      invalidKeys.push(value);
    } else {
      enabledFeatures[value as keyof ExperimentalFeatures] = true;
    }
  }

  return {
    features: {
      ...allowedExperimentalValues,
      ...enabledFeatures,
    },
    invalid: invalidKeys,
  };
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
