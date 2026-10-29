/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLicense } from '../../../../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import { useUpsellingMessage } from '../../../../../../common/hooks/use_upselling';

export interface UseIsRegistryCredentialHardeningAvailableResult {
  /** True when the experimental flag is on; controls whether the control renders at all. */
  isVisible: boolean;
  /** True when the flag is on, license is Enterprise, and there is no upsell message blocking it. */
  isAvailable: boolean;
  upsellMessage: string | undefined;
}

export const useIsRegistryCredentialHardeningAvailable =
  (): UseIsRegistryCredentialHardeningAvailableResult => {
    const isVisible = useIsExperimentalFeatureEnabled('registryCredentialHardening');
    const isEnterprise = useLicense().isEnterprise();
    const upsellMessage = useUpsellingMessage('endpoint_registry_credential_hardening');

    return {
      isVisible,
      isAvailable: isVisible && isEnterprise && !upsellMessage,
      upsellMessage,
    };
  };
