/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { UseField, fieldValidators } from '../../../../shared_imports';
import { MlJobSelect } from '../ml_job_select';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import * as i18n from './translations';

interface MachineLearningJobIdEditProps {
  path: string;
  shouldShowHelpText?: boolean;
}

export function MachineLearningJobIdEdit({
  path,
  shouldShowHelpText,
}: MachineLearningJobIdEditProps): JSX.Element {
  const { loading, jobs } = useSecurityJobs();

  const componentProps = useMemo(
    () => ({
      jobs,
      loading,
      shouldShowHelpText,
    }),
    [jobs, loading, shouldShowHelpText]
  );

  return (
    <UseField
      path={path}
      config={MACHINE_LEARNING_JOB_ID_FIELD_CONFIG}
      component={MlJobSelect}
      componentProps={componentProps}
    />
  );
}

const MACHINE_LEARNING_JOB_ID_FIELD_CONFIG = {
  label: i18n.MACHINE_LEARNING_JOB_ID_LABEL,
  validations: [
    {
      validator: fieldValidators.emptyField(
        i18n.MACHINE_LEARNING_JOB_ID_EMPTY_FIELD_VALIDATION_ERROR
      ),
    },
  ],
};
