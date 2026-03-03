/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isArray } from 'lodash';
import type { Capabilities } from '@kbn/core/public';

/**
 * The format of defining features supports OR and AND mechanism. To specify features in an OR fashion
 * they can be defined in a single level array like: [requiredFeature1, requiredFeature2]. If either of these features
 * is satisfied the link would be included. To require that the features be AND'd together a second level array
 * can be specified: [feature1, [feature2, feature3]] this would result in feature1 || (feature2 && feature3). To specify
 * features that all must be and'd together an example would be: [[feature1, feature2]], this would result in the boolean
 * operation feature1 && feature2.
 *
 * The final format is to specify a single feature, this would be like: features: feature1, which is the same as
 * features: [feature1]
 */
export type RequiredCapabilities = string | Array<string | string[]>;

/**
 * Checks if the capabilities exist and are enabled in the capabilities object.
 * It checks if the capabilities are enabled or not.
 * It does not distinguish between missing and disabled capabilities.
 */
export const hasCapabilities = (
  capabilities: Capabilities,
  requiredCapabilities?: RequiredCapabilities
): boolean => {
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return true;
  }
  if (!isArray(requiredCapabilities)) {
    return !!get(capabilities, requiredCapabilities, false);
  } else {
    return requiredCapabilities.some((requiredCapsOr) => {
      if (isArray(requiredCapsOr)) {
        return requiredCapsOr.every((requiredCapsAnd) => get(capabilities, requiredCapsAnd, false));
      }
      return get(capabilities, requiredCapsOr, false);
    });
  }
};

/**
 * Checks if the capabilities exist in the capabilities object.
 * It does not check if the capabilities are enabled or not.
 * This is used to check if the capabilities have been registered in the Kibana feature privileges configuration.
 */
export const existCapabilities = (
  capabilities: Capabilities,
  requiredCapabilities?: RequiredCapabilities
): boolean => {
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return true;
  }
  if (!isArray(requiredCapabilities)) {
    return get(capabilities, requiredCapabilities) != null;
  } else {
    return requiredCapabilities.some((requiredCapsOr) => {
      if (isArray(requiredCapsOr)) {
        return requiredCapsOr.every(
          (requiredCapsAnd) => get(capabilities, requiredCapsAnd) != null
        );
      }
      return get(capabilities, requiredCapsOr) != null;
    });
  }
};
