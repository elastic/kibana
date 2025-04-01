/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SeverityMappingReadOnly } from './severity_mapping';

export default {
  component: SeverityMappingReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/severity_mapping',
};

export const Default = () => (
  <SeverityMappingReadOnly
    severityMapping={[
      {
        field: 'event.severity',
        operator: 'equals',
        severity: 'low',
        value: 'LOW',
      },
      {
        field: 'google_workspace.alert.metadata.severity',
        operator: 'equals',
        severity: 'high',
        value: 'VERY HIGH',
      },
    ]}
  />
);

export const EmptyArrayValue = () => <SeverityMappingReadOnly severityMapping={[]} />;
