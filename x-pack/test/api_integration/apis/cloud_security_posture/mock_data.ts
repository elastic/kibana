/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';

const chance = new Chance();

export const vulnerabilityMockData = [
  {
    resource: {
      name: 'NameNama',
      id: '12345',
    },
    vulnerability: {
      severity: 'MEDIUM',
      package: {
        name: 'github.com/aws/aws-sdk-go',
        version: 'v1.42.30',
      },
    },
    cvss: {
      redhat: {
        V3Vector: 'CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:C/C:H/I:N/A:N',
        V3Score: 5.6,
      },
    },
  },
];
