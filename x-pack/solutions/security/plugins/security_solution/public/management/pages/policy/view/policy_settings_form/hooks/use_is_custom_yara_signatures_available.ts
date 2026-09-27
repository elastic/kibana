/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLicense } from '../../../../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import { useUpsellingMessage } from '../../../../../../common/hooks/use_upselling';

export interface UseIsCustomYaraSignaturesAvailableResult {
  isAvailable: boolean;
  upsellMessage: string | undefined;
  /**
   * True when the flag and product feature both allow custom YARA signatures and only the
   * license is insufficient. A leftover `true` in this state gets rejected with a 403 by license
   * validation on save, unlike the flag/product-feature-off states, which the server strips to
   * absent safely. Callers use this to decide whether an unrelated edit must proactively clear
   * the field, instead of leaving it for the server to resolve.
   */
  isGatedByLicenseOnly: boolean;
}

export const useIsCustomYaraSignaturesAvailable = (): UseIsCustomYaraSignaturesAvailableResult => {
  const isCustomYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
    'customYaraSignaturesEnabled'
  );
  const isEnterprise = useLicense().isEnterprise();
  const upsellMessage = useUpsellingMessage('endpoint_custom_yara_signatures');

  return {
    isAvailable: isCustomYaraSignaturesEnabled && isEnterprise && !upsellMessage,
    upsellMessage,
    isGatedByLicenseOnly: isCustomYaraSignaturesEnabled && !upsellMessage && !isEnterprise,
  };
};
