/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { capitalize } from 'lodash';
import type { BackfillStatus } from '../../types';

function getBackfillStatusColor(status: BackfillStatus) {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'running':
      return 'success';
    default:
      return 'subdued';
  }
}

export const BackfillStatusInfo = ({ status }: { status: BackfillStatus }) => {
  const capitalizedStatus = capitalize(status);
  const color = getBackfillStatusColor(status);

  return <EuiHealth color={color}>{capitalizedStatus}</EuiHealth>;
};
