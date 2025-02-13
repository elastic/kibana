/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCheckableCard, EuiText, EuiTitle } from '@elastic/eui';

export const SettingsCheckableCard: React.FC<{
  checked: boolean;
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}> = ({ checked, description, disabled, id, label, onChange }) => (
  <EuiCheckableCard
    label={
      <EuiTitle size="xs">
        <h4>{label}</h4>
      </EuiTitle>
    }
    disabled={disabled}
    checkableType="checkbox"
    onChange={onChange}
    checked={checked}
    id={id}
  >
    <EuiText color="subdued" size="s">
      <p>{description}</p>
    </EuiText>
  </EuiCheckableCard>
);
