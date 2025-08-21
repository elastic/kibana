/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { AwsCredentialsTypeOptions } from './get_aws_credentials_form_options';
import type { AwsCredentialsType } from '../types';
import { AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from './aws_test_subjects';

export const AwsCredentialTypeSelector = ({
  type,
  onChange,
  label,
  options,
  disabled = false,
}: {
  onChange(type: AwsCredentialsType): void;
  type: AwsCredentialsType;
  label: string;
  options: AwsCredentialsTypeOptions;
  disabled: boolean;
}) => (
  <EuiFormRow fullWidth label={label}>
    <EuiSelect
      fullWidth
      options={options}
      value={type}
      disabled={disabled}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AwsCredentialsType);
      }}
      data-test-subj={AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ}
    />
  </EuiFormRow>
);
