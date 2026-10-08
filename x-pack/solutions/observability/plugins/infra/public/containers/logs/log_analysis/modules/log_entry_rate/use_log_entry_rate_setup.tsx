/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useAnalysisSetupState } from '../../log_analysis_setup_state';
import { useLogEntryRateModuleContext } from './use_log_entry_rate_module';

export const useLogEntryRateSetup = () => {
  const {
    cleanUpAndSetUpModule,
    lastSetupErrorMessages,
    moduleDescriptor,
    setUpModule,
    setupStatus,
    sourceConfiguration,
    viewResults,
  } = useLogEntryRateModuleContext();

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
    cleanUpAndSetUp,
    endTime,
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

export const [LogEntryRateSetupProvider, useLogEntryRateSetupContext] =
  createContainer(useLogEntryRateSetup);
