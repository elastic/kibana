/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
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
    isCpsEnabled,
    isCpsManagerReady,
    isValidating,
    projectRouting,
    setEndTime,
    setProjectRouting,
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
    isCpsEnabled,
    isCpsManagerReady,
    isValidating,
    lastSetupErrorMessages,
    moduleDescriptor,
    projectRouting,
    setEndTime,
    setProjectRouting,
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

export const [LogEntryCategoriesSetupProvider, useLogEntryCategoriesSetupContext] = createContainer(
  useLogEntryCategoriesSetup
);
