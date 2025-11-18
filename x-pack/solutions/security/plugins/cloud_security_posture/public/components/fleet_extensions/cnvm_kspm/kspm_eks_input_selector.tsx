/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RadioGroup } from '@kbn/cloud-security-posture';
import type { PostureInput } from '../../../../common/types_old';
import { getPolicyTemplateInputOptions, type NewPackagePolicyPostureInput } from '../utils';

interface KspmEksInputSelector {
  disabled: boolean;
  input: NewPackagePolicyPostureInput;
  setInput: (inputType: PostureInput) => void;
}

export const KspmEksInputSelector = ({ input, disabled, setInput }: KspmEksInputSelector) => {
  const baseOptions = getPolicyTemplateInputOptions(input.policy_template);
  const options = baseOptions
    ? baseOptions.map((option) => ({
        ...option,
        disabled: option.disabled || disabled,
        label: option.label,
        icon: option.icon,
      }))
    : [];

  return (
    <RadioGroup
      disabled={disabled}
      idSelected={input.type}
      options={options}
      onChange={(inputType) => setInput(inputType as PostureInput)}
      size="m"
      name="kspmEksInput"
    />
  );
};
