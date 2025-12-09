/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLicense } from '../../../common/hooks/use_license';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

/**
 * Centralized capability helper for everything related to the rule gaps auto-fill feature. ()
 */
export const useGapAutoFillCapabilities = () => {
  const license = useLicense();
  const gapAutoFillSchedulerEnabled = useIsExperimentalFeatureEnabled(
    'gapAutoFillSchedulerEnabled'
  );
  const hasEnterpriseLicense = license.isEnterprise();
  const { edit: canEditRules, read: canReadRules } = useUserPrivileges().rulesPrivileges;

  return useMemo(
    () => ({
      hasEnterpriseLicense,
      canAccessGapAutoFill: gapAutoFillSchedulerEnabled && hasEnterpriseLicense && canReadRules,
      canEditGapAutoFill: gapAutoFillSchedulerEnabled && hasEnterpriseLicense && canEditRules,
    }),
    [gapAutoFillSchedulerEnabled, hasEnterpriseLicense, canEditRules, canReadRules]
  );
};
