/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

/** One entry in a Worker's header warning icon and post-save notice. */
export interface WorkerWarningReason {
  id: string;
  message: React.ReactNode;
}

/**
 * Reason text shared by the header warning icon and the post-save notice, so the two cannot drift.
 * Several reasons stack as a list with no heading: a Worker whose being off only hurts another
 * Worker is not itself blocked, so a heading such as "This Worker can't run:" would misread.
 */
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
