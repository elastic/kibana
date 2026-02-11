/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { useLicense } from '../../../common/hooks/use_license';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useProductFeatureKeys } from '../../../common/hooks/use_product_feature_keys';

/**
 * Centralized capability helper for everything related to the rule gaps auto-fill feature. ()
 */
export const useGapAutoFillCapabilities = () => {
  const license = useLicense();
  const productFeatureKeys = useProductFeatureKeys();
  const hasEnterpriseLicense = license.isEnterprise();
  const { edit: canEditRules, read: canReadRules } = useUserPrivileges().rulesPrivileges.rules;
  const hasRuleGapsAutoFillFeature = productFeatureKeys.has(
    ProductFeatureSecurityKey.ruleGapsAutoFill
  );

  return useMemo(
    () => ({
      hasEnterpriseLicense,
      canAccessGapAutoFill: hasEnterpriseLicense && hasRuleGapsAutoFillFeature && canReadRules,
      canEditGapAutoFill: hasEnterpriseLicense && hasRuleGapsAutoFillFeature && canEditRules,
    }),
    [hasEnterpriseLicense, hasRuleGapsAutoFillFeature, canEditRules, canReadRules]
  );
};
