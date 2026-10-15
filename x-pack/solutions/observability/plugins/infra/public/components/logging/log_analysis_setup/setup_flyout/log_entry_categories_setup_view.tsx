/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiSteps, EuiText, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import useMount from 'react-use/lib/useMount';
import { useLogEntryCategoriesSetupContext } from '../../../../containers/logs/log_analysis/modules/log_entry_categories';
import type { LoadedProjectScopeProjects } from '../initial_configuration_step';
import { createInitialConfigurationStep } from '../initial_configuration_step';
import { createProcessStep } from '../process_step';

export const LogEntryCategoriesSetupView: React.FC<{
  onClose: () => void;
  onOpenProjectScope: (projects: LoadedProjectScopeProjects) => void;
}> = ({ onClose, onOpenProjectScope }) => {
  const {
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
    setStartTime,
    setValidatedIndices,
    setUp,
    setupStatus,
    startTime,
    validatedIndices,
    validationErrors,
    viewResults,
  } = useLogEntryCategoriesSetupContext();

  useMount(() => {
    fetchJobStatus();
  });

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
        previousQualityWarnings: categoryQualityWarnings,
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
      categoryQualityWarnings,
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
