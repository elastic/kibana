/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExperimentalFeatures as GenericExperimentalFeatures } from '@kbn/security-solution-plugin/common';

export type ServerlessExperimentalFeatures = Record<
  keyof typeof allowedExperimentalValues,
  boolean
>;

/**
 * A list of allowed values that can be used in `xpack.securitySolutionServerless.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  /**
   * <Add a description of the feature here>
   *
   * [This is a fake feature key to showcase how to add a new serverless-specific experimental flag.
   * It also prevents `allowedExperimentalValues` from being empty. It should be removed once a real feature is added.]
   */
  _serverlessFeatureEnabled: false,
});

type ServerlessExperimentalConfigKeys = Array<keyof ServerlessExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(
  allowedExperimentalValues
) as Readonly<ServerlessExperimentalConfigKeys>;

export type ExperimentalFeatures = ServerlessExperimentalFeatures & GenericExperimentalFeatures;
/**
 * Parses the string value used in `xpack.securitySolutionServerless.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 * The generic experimental features are merged with the serverless values to ensure they are available
 *
 * @param configValue
 * @throws SecuritySolutionInvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (
  configValue: string[],
  genericExperimentalFeatures: GenericExperimentalFeatures
): { features: ExperimentalFeatures; invalid: string[]; duplicated: string[] } => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};
  const invalidKeys: string[] = [];
  const duplicatedKeys: string[] = [];

  for (const value of configValue) {
    if (genericExperimentalFeatures[value as keyof GenericExperimentalFeatures] != null) {
      duplicatedKeys.push(value);
    } else if (!allowedKeys.includes(value as keyof ServerlessExperimentalFeatures)) {
      invalidKeys.push(value);
    } else {
      enabledFeatures[value as keyof ServerlessExperimentalFeatures] = true;
    }
  }

  return {
    features: {
      ...genericExperimentalFeatures,
      ...allowedExperimentalValues,
      ...enabledFeatures,
    },
    invalid: invalidKeys,
    duplicated: duplicatedKeys,
  };
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
