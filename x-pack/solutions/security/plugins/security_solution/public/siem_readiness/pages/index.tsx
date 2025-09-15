/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiPageSection } from '@elastic/eui';
import { ReadinessTasksTable } from './readiness_tasks_table';
import { ReadinessSummary } from './readiness_summary';

const SiemReadinessDashboard = () => {
  return (
    <>
      <EuiPageHeader pageTitle="SIEM Readiness" bottomBorder={true} />
      <EuiPageSection>
        <ReadinessSummary />
      </EuiPageSection>
      <EuiPageSection>
        <ReadinessTasksTable />
      </EuiPageSection>
    </>
  );
};

SiemReadinessDashboard.displayName = 'SiemReadinessDashboard';

// eslint-disable-next-line import/no-default-export
export default SiemReadinessDashboard;
