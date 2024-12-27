/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contentSources } from './content_sources.mock';
import { users } from './users.mock';

export const groups = [
  {
    id: '123',
    name: 'group',
    createdAt: '2020-10-06',
    updatedAt: '2020-10-06',
    users,
    usersCount: users.length,
    color: 'motherofpearl',
    contentSources,
    canEditGroup: true,
    canDeleteGroup: true,
  },
];
