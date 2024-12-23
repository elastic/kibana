/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatReadOnly } from './threat';

export default {
  component: ThreatReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threat',
};

export const Default = () => (
  <ThreatReadOnly
    threat={[
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0006',
          name: 'Credential Access',
          reference: 'https://attack.mitre.org/tactics/TA0006/',
        },
        technique: [
          {
            id: 'T1003',
            name: 'OS Credential Dumping',
            reference: 'https://attack.mitre.org/techniques/T1003/',
            subtechnique: [
              {
                id: 'T1003.001',
                name: 'LSASS Memory',
                reference: 'https://attack.mitre.org/techniques/T1003/001/',
              },
            ],
          },
        ],
      },
    ]}
  />
);

export const EmptyArrayValue = () => <ThreatReadOnly threat={[]} />;
