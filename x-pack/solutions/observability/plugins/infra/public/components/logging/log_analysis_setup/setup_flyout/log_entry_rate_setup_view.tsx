/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiSteps } from '@elastic/eui';
import type { LoadedProjectScopeProjects } from '../initial_configuration_step';
import { createInitialConfigurationStep } from '../initial_configuration_step';
import { createProcessStep } from '../process_step';
import { useLogEntryRateSetupContext } from '../../../../containers/logs/log_analysis/modules/log_entry_rate';

export const LogEntryRateSetupView: React.FC<{
  onClose: () => void;
  onOpenProjectScope: (projects: LoadedProjectScopeProjects) => void;
}> = ({ onClose, onOpenProjectScope }) => {
  const {
    cleanUpAndSetUp,
    endTime,
    isCpsEnabled,
    isCpsManagerReady,
    isValidating,
    lastSetupErrorMessages,
    moduleDescriptor,
    projectRouting,
    setEndTime,
    setStartTime,
    setValidatedIndices,
    setUp,
    setupStatus,
    startTime,
    validatedIndices,
    validationErrors,
    viewResults,
  } = useLogEntryRateSetupContext();

  const viewResultsAndClose = useCallback(() => {
    viewResults();
    onClose();
  }, [viewResults, onClose]);

  const steps = useMemo(
    () => [
      createInitialConfigurationStep({
        setStartTime,
        setEndTime,
        startTime,
        endTime,
        isValidating,
        validatedIndices,
        setupStatus,
        setValidatedIndices,
        validationErrors,
        projectScope: {
          isCpsEnabled,
          isCpsManagerReady,
          projectRouting,
          onOpenProjectScope,
        },
      }),
      createProcessStep({
        cleanUpAndSetUp,
        errorMessages: lastSetupErrorMessages,
        isConfigurationValid: validationErrors.length <= 0 && !isValidating,
        setUp,
        setupStatus,
        viewResults: viewResultsAndClose,
      }),
    ],
    [
      cleanUpAndSetUp,
      endTime,
      isCpsEnabled,
      isCpsManagerReady,
      isValidating,
      lastSetupErrorMessages,
      onOpenProjectScope,
      projectRouting,
      setEndTime,
      setStartTime,
      setUp,
      setValidatedIndices,
      setupStatus,
      startTime,
      validatedIndices,
      validationErrors,
      viewResultsAndClose,
    ]
  );

  return (
    <>
      <EuiTitle size="s">
        <h3>{moduleDescriptor.moduleName} </h3>
      </EuiTitle>
      <EuiText size="s">{moduleDescriptor.moduleDescription}</EuiText>
      <EuiSpacer />
      <EuiSteps steps={steps} />
    </>
  );
};
