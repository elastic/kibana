/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PrivmonDoc,
  PrivmonLoginDoc,
  PrivmonPrivilegeDoc,
} from '../../api/entity_analytics/privmon';
import { ACTIONS } from './constants';

export const isPrivmonLoginDoc = (doc: PrivmonDoc): doc is PrivmonLoginDoc => {
  return doc?.event?.action === ACTIONS.LOGIN;
};

export const isPrivmonPrivilegeDoc = (doc: PrivmonDoc): doc is PrivmonPrivilegeDoc => {
  return doc?.event?.action === ACTIONS.GROUP_ADD;
};

export const isSuccessfulGroupAddDoc = (doc: PrivmonDoc): boolean => {
  return doc?.event?.action === ACTIONS.GROUP_ADD && doc.event.outcome === 'success';
};
