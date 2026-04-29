/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatMappingReadOnly } from './threat_mapping';

export default {
  component: ThreatMappingReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threat_mapping',
};

export const Default = () => (
  <ThreatMappingReadOnly
    threatMapping={[
      {
        entries: [
          {
            field: 'Endpoint.capabilities',
            type: 'mapping',
            value: 'Target.dll.pe.description',
          },
        ],
      },
    ]}
  />
);
