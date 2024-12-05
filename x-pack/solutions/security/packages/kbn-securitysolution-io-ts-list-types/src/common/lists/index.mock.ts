/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { List, ListArray } from '.';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

export const getListMock = (): List => ({
  id: 'some_uuid',
  list_id: 'list_id_single',
  namespace_type: 'single',
  type: 'detection',
});

export const getEndpointListMock = (): List => ({
  id: ENDPOINT_LIST_ID,
  list_id: ENDPOINT_LIST_ID,
  namespace_type: 'agnostic',
  type: 'endpoint',
});

export const getListArrayMock = (): ListArray => [getListMock(), getEndpointListMock()];
