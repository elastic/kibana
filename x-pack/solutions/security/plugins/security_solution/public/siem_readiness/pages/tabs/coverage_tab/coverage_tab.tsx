/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { RuleCoveragePanel } from './rule_coverage_panel';
import { DataCoveragePanel } from './data_coverage_panel';

export const CoverageTab: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <RuleCoveragePanel />
      <EuiSpacer size="m" />
      <DataCoveragePanel />
    </>
  );
};
