/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSecuritySolutionInitialization } from '../../../../common/components/initialization/use_security_solution_initialization';
import { INITIALIZATION_FLOW_INIT_PREBUILT_RULES } from '../../../../../common/api/initialization';

export const useIsInitializingPrebuiltRulesPackage = (): boolean => {
  const initState = useSecuritySolutionInitialization([INITIALIZATION_FLOW_INIT_PREBUILT_RULES]);
  return initState[INITIALIZATION_FLOW_INIT_PREBUILT_RULES].loading;
};
