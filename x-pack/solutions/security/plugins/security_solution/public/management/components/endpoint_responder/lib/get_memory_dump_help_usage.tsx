/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiSpacer } from '@elastic/eui';

export const getMemoryDumpHelpUsage = (): ReactNode => {
  return (
    <>
      {'memory-dump --kernel [ --comment ]'}
      <EuiSpacer size="xs" />
      {'memory-dump --process --entityId [ --comment ]'}
      <EuiSpacer size="xs" />
      {'memory-dump --process --pid [ --comment ]'}
    </>
  );
};
