/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiText } from '@elastic/eui';

interface Props {
  label: string;
  description: string;
}

export const RoleOptionLabel: React.FC<Props> = ({ label, description }) => (
  <>
    <EuiText size="s">{label.charAt(0).toUpperCase() + label.toLowerCase().slice(1)}</EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="xs">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="s" />
  </>
);
