/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { WorkerWarningReason } from './worker_dependencies';

/**
 * Reason text shared by the header warning icon and the post-save notice, so the two cannot drift.
 * Several reasons stack as a list with no heading: the provider icon is not "blocked", so a
 * heading such as "This Worker can't run:" would misread there.
 */
export const WorkerWarningContent: React.FC<{ reasons: WorkerWarningReason[] }> = ({ reasons }) => {
  if (reasons.length === 0) {
    return null;
  }
  if (reasons.length === 1) {
    return <p css={{ margin: 0 }}>{reasons[0].message}</p>;
  }
  return (
    <ul css={{ margin: 0, paddingInlineStart: '1.25em', listStyle: 'disc' }}>
      {reasons.map((reason) => (
        <li key={reason.id}>{reason.message}</li>
      ))}
    </ul>
  );
};
