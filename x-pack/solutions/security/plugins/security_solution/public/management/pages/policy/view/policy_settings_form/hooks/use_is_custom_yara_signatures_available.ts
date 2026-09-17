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
  };
};
