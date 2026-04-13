/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useSecuritySolutionInitialization } from '../../../../common/components/initialization/use_security_solution_initialization';
import { INITIALIZATION_FLOW_INIT_PREBUILT_RULES } from '../../../../../common/api/initialization';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query';

/**
 * Invalidates the prebuilt rules status cache once the prebuilt rules package
 * initialization flow completes. This ensures consumers see up-to-date package
 * counts after a fresh install.
 */
export const useInvalidatePrebuiltRulesStatusOnInit = () => {
  const initState = useSecuritySolutionInitialization([INITIALIZATION_FLOW_INIT_PREBUILT_RULES]);
  const isUpgradingSecurityPackages = initState[INITIALIZATION_FLOW_INIT_PREBUILT_RULES].loading;

  const invalidatePrebuiltRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();

  useEffect(() => {
    if (!isUpgradingSecurityPackages) {
      invalidatePrebuiltRulesStatus();
    }
  }, [isUpgradingSecurityPackages, invalidatePrebuiltRulesStatus]);
};
