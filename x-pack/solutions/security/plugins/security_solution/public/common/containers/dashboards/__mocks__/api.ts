/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_DASHBOARDS_RESPONSE = [
  {
    type: 'dashboard',
    id: 'c0ac2c00-c1c0-11e7-8995-936807a28b16-ecs',
    namespaces: ['default'],
    attributes: {
      description: 'Summary of Linux kernel audit events.',
      title: '[Auditbeat Auditd] Overview ECS',
      version: 1,
    },
    references: [
      {
        name: 'tag-ref-ba964280-d211-11ed-890b-153ddf1a08e9',
        id: 'ba964280-d211-11ed-890b-153ddf1a08e9',
        type: 'tag',
      },
    ],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.7.0',
    updated_at: '2023-04-03T11:38:00.902Z',
    created_at: '2023-04-03T11:20:50.603Z',
    version: 'WzE4NzQsMV0=',
    score: 0,
  },
];

export const getDashboardsByTagIds = jest
  .fn()
  .mockImplementation(() => Promise.resolve(DEFAULT_DASHBOARDS_RESPONSE));
