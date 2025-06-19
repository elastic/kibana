/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureSecurityKey, SecuritySubFeatureId } from '../product_features_keys';
import type { ProductFeatureKibanaConfig } from '../types';

export interface SecurityFeatureParams {
  /**
   * Experimental features.
   * Unfortunately these can't be properly Typed due to it requiring an
   * import directly from the Security Solution plugin. The list of `keys` in this
   * object are defined here:
   * @see https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/experimental_features.ts#L14
   */
  experimentalFeatures: Record<string, boolean>;
  savedObjects: string[];

  /**
   * Sort of temporary solution to be able to migrate from Endpoint Exceptions (on Serverless) OR SIEM (on ESS)
   * to global_artifact_management_all.
   *
   * It would be best not to use it for other things.
   */
  isServerless: boolean;
}

export type DefaultSecurityProductFeaturesConfig = Omit<
  Record<ProductFeatureSecurityKey, ProductFeatureKibanaConfig<SecuritySubFeatureId>>,
  ProductFeatureSecurityKey.endpointExceptions
  // | add not generic security app features here
>;
