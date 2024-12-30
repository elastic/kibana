/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableRow, EuiTableRowCell } from '@elastic/eui';

import { User } from '../../../types';

interface UserRowProps {
  user: User;
  showEmail?: boolean;
}

export const UserRow: React.FC<UserRowProps> = ({ user: { name, email }, showEmail }) => (
  <EuiTableRow>
    <EuiTableRowCell>{name}</EuiTableRowCell>
    <EuiTableRowCell>{showEmail && <span>{email}</span>}</EuiTableRowCell>
  </EuiTableRow>
);
