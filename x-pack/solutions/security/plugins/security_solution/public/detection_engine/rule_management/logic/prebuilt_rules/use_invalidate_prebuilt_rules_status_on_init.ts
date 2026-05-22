/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useIsInitializingPrebuiltRulesPackage } from './use_is_initializing_prebuilt_rules_package';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query';

/**
 * Invalidates the prebuilt rules status cache once the prebuilt rules package
 * initialization flow completes. This ensures consumers see up-to-date package
 * counts after a fresh install.
 */
export const useInvalidatePrebuiltRulesStatusOnInit = () => {
  const isInitializingPrebuiltRulesPackage = useIsInitializingPrebuiltRulesPackage();
  const invalidatePrebuiltRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();

  useEffect(() => {
    if (!isInitializingPrebuiltRulesPackage) {
      invalidatePrebuiltRulesStatus();
    }
  }, [isInitializingPrebuiltRulesPackage, invalidatePrebuiltRulesStatus]);
};
