/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';

import styled from 'styled-components';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana';
import { HelpText } from './help_text';

import * as i18n from './translations';

interface MlJobValue {
  id: string;
  description: string;
  name?: string;
}

const JobDisplayContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

type MlJobOption = EuiComboBoxOptionOption<MlJobValue>;

const MlJobSelectEuiFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: 5px;
`;

const MlJobEuiButton = styled(EuiButton)`
  margin-top: 20px;
`;

const JobDisplay: React.FC<MlJobValue> = ({ description, name, id }) => (
  <JobDisplayContainer>
    <strong>{name ?? id}</strong>
    <EuiToolTip content={description}>
      <EuiText size="xs" color="subdued">
        <p>{description}</p>
      </EuiText>
    </EuiToolTip>
  </JobDisplayContainer>
);

interface MlJobSelectProps {
  describedByIds: string[];
  field: FieldHook;
}

const renderJobOption = (option: MlJobOption) => (
  <JobDisplay
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id={option.value!.id}
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    description={option.value!.description}
    name={option.value?.name}
  />
);

export const MlJobSelect: React.FC<MlJobSelectProps> = ({ describedByIds = [], field }) => {
  const jobIds = field.value as string[];
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { loading, jobs } = useSecurityJobs();
  const { getUrlForApp, navigateToApp } = useKibana().services.application;
  const mlUrl = getUrlForApp('ml');
  const handleJobSelect = useCallback(
    (selectedJobOptions: MlJobOption[]): void => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const selectedJobIds = selectedJobOptions.map((option) => option.value!.id);
      field.setValue(selectedJobIds);
    },
    [field]
  );

  const jobOptions = jobs.map((job) => ({
    value: {
      id: job.id,
      description: job.description,
      name: job.customSettings?.security_app_display_name,
    },
    // Make sure users can search for id or name.
    // The label contains the name and id because EuiComboBox uses it for the textual search.
    label: `${job.customSettings?.security_app_display_name} ${job.id}`,
  }));

  const selectedJobOptions = jobOptions
    .filter((option) => jobIds.includes(option.value.id))
    // 'label' defines what is rendered inside the selected ComboBoxPill
    .map((options) => ({ ...options, label: options.value.name ?? options.value.id }));

  const notRunningJobIds = useMemo<string[]>(() => {
    const selectedJobs = jobs.filter(({ id }) => jobIds.includes(id));
    return selectedJobs.reduce((acc, job) => {
      if (!isJobStarted(job.jobState, job.datafeedState)) {
        acc.push(job.id);
      }
      return acc;
    }, [] as string[]);
  }, [jobs, jobIds]);

  return (
    <MlJobSelectEuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={field.label}
          helpText={<HelpText href={mlUrl} notRunningJobIds={notRunningJobIds} />}
          isInvalid={isInvalid}
          error={errorMessage}
          data-test-subj="mlJobSelect"
          describedByIds={describedByIds}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiComboBox
                isLoading={loading}
                onChange={handleJobSelect}
                options={jobOptions}
                placeholder={i18n.ML_JOB_SELECT_PLACEHOLDER_TEXT}
                renderOption={renderJobOption}
                rowHeight={50}
                selectedOptions={selectedJobOptions}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MlJobEuiButton
          iconType="popout"
          iconSide="right"
          onClick={() => navigateToApp('ml', { openInNewTab: true })}
        >
          {i18n.CREATE_CUSTOM_JOB_BUTTON_TITLE}
        </MlJobEuiButton>
      </EuiFlexItem>
    </MlJobSelectEuiFlexGroup>
  );
};
