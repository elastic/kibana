/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

export interface WorkerWarningReason {
  id: string;
  message: React.ReactNode;
}

export const WorkerWarningContent: React.FC<{ reasons: WorkerWarningReason[] }> = ({ reasons }) => {
  const { euiTheme } = useEuiTheme();
  if (reasons.length === 1) {
    return <p css={{ margin: 0 }}>{reasons[0].message}</p>;
  }
  return (
    <ul css={{ margin: 0, paddingInlineStart: euiTheme.size.base, listStyle: 'disc' }}>
      {reasons.map((reason) => (
        <li key={reason.id}>{reason.message}</li>
      ))}
    </ul>
  );
};
