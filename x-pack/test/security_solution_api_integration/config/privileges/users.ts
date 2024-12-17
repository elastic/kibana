/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { User } from '../services/types';
import {
  secAllV1,
  secNoneV1,
  secReadV1,
  secNotesAllV2,
  secNotesReadV2,
  secNotesNoneV2,
  secTimelineAllV2,
  secTimelineReadV2,
  secTimelineNoneV2,
} from './roles';

/**
 * Users for privilege tests
 */

export const secAllV1User: User = {
  username: 'sec_v1_all',
  password: 'password',
  roles: [secAllV1.name],
};

export const secReadV1User: User = {
  username: 'sec_v1_read',
  password: 'password',
  roles: [secReadV1.name],
};

export const secNoneV1User: User = {
  username: 'sec_v1_none',
  password: 'password',
  roles: [secNoneV1.name],
};

export const secNotesAllUser: User = {
  username: 'sec_Notes_All',
  password: 'password',
  roles: [secNotesAllV2.name],
};

export const secNotesReadUser: User = {
  username: 'sec_Notes_Read',
  password: 'password',
  roles: [secNotesReadV2.name],
};

export const secNotesNoneUser: User = {
  username: 'sec_Notes_None',
  password: 'password',
  roles: [secNotesNoneV2.name],
};

export const secTimelineAllUser: User = {
  username: 'sec_timeline_All',
  password: 'password',
  roles: [secTimelineAllV2.name],
};

export const secTimelineReadUser: User = {
  username: 'sec_timeline_Read',
  password: 'password',
  roles: [secTimelineReadV2.name],
};

export const secTimelineNoneUser: User = {
  username: 'sec_timeline_None',
  password: 'password',
  roles: [secTimelineNoneV2.name],
};

export const allUsers: User[] = [
  secAllV1User,
  secReadV1User,
  secNoneV1User,
  secNotesAllUser,
  secNotesNoneUser,
  secNotesReadUser,
  secTimelineAllUser,
  secTimelineNoneUser,
  secTimelineReadUser,
];
