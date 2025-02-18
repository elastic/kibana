/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { checkIfPopupMessagesContainCustomNotifications } from '../../../common/endpoint/models/policy_config_helpers';
import type { ProductFeaturesService } from '../../lib/product_features_service';

export const validatePolicyAgainstProductFeatures = (
  inputs: NewPackagePolicyInput[],
  productFeaturesService: ProductFeaturesService
): void => {
  const input = inputs.find((i) => i.type === 'endpoint');
  const policySettings = input?.config?.policy?.value;

  if (policySettings) {
    const globalManifestVersion = policySettings.global_manifest_version;

    if (globalManifestVersion) {
      if (
        globalManifestVersion !== 'latest' &&
        !productFeaturesService.isEnabled(ProductFeatureSecurityKey.endpointProtectionUpdates)
      ) {
        const productFeatureError: Error & { statusCode?: number; apiPassThrough?: boolean } =
          new Error(
            'To modify protection updates, you must add Endpoint Complete to your project.'
          );
        productFeatureError.statusCode = 403;
        productFeatureError.apiPassThrough = true;
        throw productFeatureError;
      }
    }

    const popupMessagesContainCustomNotifications =
      checkIfPopupMessagesContainCustomNotifications(policySettings);

    if (
      popupMessagesContainCustomNotifications &&
      !productFeaturesService.isEnabled(ProductFeatureSecurityKey.endpointCustomNotification)
    ) {
      const productFeatureError: Error & { statusCode?: number; apiPassThrough?: boolean } =
        new Error(
          'To customize the user notification, you must add Endpoint Protection Complete to your project.'
        );
      productFeatureError.statusCode = 403;
      productFeatureError.apiPassThrough = true;
      throw productFeatureError;
    }
  }
};
