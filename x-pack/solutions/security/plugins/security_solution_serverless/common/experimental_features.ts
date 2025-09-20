/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExperimentalFeatures as GenericExperimentalFeatures } from '@kbn/experimental-features';

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
