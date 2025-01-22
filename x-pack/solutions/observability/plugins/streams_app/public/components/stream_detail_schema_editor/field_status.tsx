/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { FIELD_STATUS_MAP, FieldStatus } from './configuration_maps';

export const FieldStatusBadge = ({ status }: { status: FieldStatus }) => {
  return (
    <>
      <EuiBadge color={FIELD_STATUS_MAP[status].color}>{FIELD_STATUS_MAP[status].label}</EuiBadge>
    </>
  );
};
