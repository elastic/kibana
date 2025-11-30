/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLicense } from '../../../common/hooks/use_license';
import { useUserData } from '../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../common/utils/privileges';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

/**
 * Centralized capability helper for everything related to the rule gaps auto-fill feature. ()
 */
export const useGapAutoFillCapabilities = () => {
  const license = useLicense();
  const [{ canUserCRUD }] = useUserData();
  const gapAutoFillSchedulerEnabled = useIsExperimentalFeatureEnabled(
    'gapAutoFillSchedulerEnabled'
  );
  const hasPlatinumLicense = license.isPlatinumPlus();
  const hasCrudPrivileges = hasUserCRUDPermission(canUserCRUD);

  return useMemo(
    () => ({
      hasPlatinumLicense,
      hasCrudPrivileges,
      canAccessGapAutoFill: gapAutoFillSchedulerEnabled && hasPlatinumLicense,
      canEditGapAutoFill: gapAutoFillSchedulerEnabled && hasPlatinumLicense && hasCrudPrivileges,
    }),
    [gapAutoFillSchedulerEnabled, hasPlatinumLicense, hasCrudPrivileges]
  );
};
