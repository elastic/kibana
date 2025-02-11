/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateComment, UpdateCommentsArray } from '@kbn/securitysolution-io-ts-list-types';

import { ID } from '../../constants.mock';

export const getUpdateCommentMock = (): UpdateComment => ({
  comment: 'some comment',
  id: ID,
});

export const getUpdateCommentsArrayMock = (): UpdateCommentsArray => [
  getUpdateCommentMock(),
  getUpdateCommentMock(),
];
