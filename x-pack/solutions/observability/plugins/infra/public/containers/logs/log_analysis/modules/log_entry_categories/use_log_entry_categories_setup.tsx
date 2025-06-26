/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAnalysisSetupState } from '../../log_analysis_setup_state';
import { useLogEntryCategoriesModuleContext } from './use_log_entry_categories_module';

export const useLogEntryCategoriesSetup = () => {
  const {
    categoryQualityWarnings,
    cleanUpAndSetUpModule,
    fetchJobStatus,
    lastSetupErrorMessages,
    moduleDescriptor,
    setUpModule,
    setupStatus,
    sourceConfiguration,
    viewResults,
  } = useLogEntryCategoriesModuleContext();

  const {
    cleanUpAndSetUp,
    endTime,
    isValidating,
    setEndTime,
    setStartTime,
    setValidatedIndices,
    setUp,
    startTime,
    validatedIndices,
    validationErrors,
  } = useAnalysisSetupState({
    cleanUpAndSetUpModule,
    moduleDescriptor,
    setUpModule,
    sourceConfiguration,
  });

  return {
    categoryQualityWarnings,
    cleanUpAndSetUp,
    endTime,
    fetchJobStatus,
    isValidating,
    lastSetupErrorMessages,
    moduleDescriptor,
    setEndTime,
    setStartTime,
    setValidatedIndices,
    setUp,
    setupStatus,
    startTime,
    validatedIndices,
    validationErrors,
    viewResults,
  };
};
