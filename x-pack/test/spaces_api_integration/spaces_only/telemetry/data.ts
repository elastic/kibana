/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface MockSpaceTelemetryFindings {
  space: {
    name: string;
    description: string;
    color: string;
    disabledFeatures: string[];
    _reserved: boolean;
  };
  type: string;
  references: [];
  managed: boolean;
  coreMigrationVersion: string;
  typeMigrationVersion: string;
  updated_at: string;
  created_at: string;
}

export type MockTelemetryFindings = MockSpaceTelemetryFindings;

export type MockTelemetryData = Record<string, MockSpaceTelemetryFindings[]>;

export const data: MockTelemetryData = {
  disabledFeaturesFindings: [
    {
      space: {
        name: 'space-1',
        description: 'This is your space-1!',
        color: '#00bfb3',
        disabledFeatures: ['canvas', 'maps'],
        _reserved: true,
      },
      type: 'space',
      references: [],
      managed: false,
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '10.1.0',
      updated_at: '2024-05-24T11:51:26.780Z',
      created_at: '2024-05-24T11:51:26.780Z',
    },
    {
      space: {
        name: 'space-2',
        description: 'This is your space-2!',
        color: '#00bfb3',
        disabledFeatures: ['savedObjectsManagement', 'canvas', 'maps'],
        _reserved: true,
      },
      type: 'space',
      references: [],
      managed: false,
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '10.1.0',
      updated_at: '2024-05-24T11:51:26.780Z',
      created_at: '2024-05-24T11:51:26.780Z',
    },
  ],
};
