/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Comment, CommentsArray } from '@kbn/securitysolution-io-ts-list-types';

export const getCommentsMock = (): Comment => ({
  comment: 'some old comment',
  created_at: '2020-04-20T15:25:31.830Z',
  created_by: 'some user',
  id: 'uuid_here',
});

export const getCommentsArrayMock = (): CommentsArray => [getCommentsMock(), getCommentsMock()];

export const mockGetFormattedComments = () =>
  getCommentsArrayMock().map((comment) => ({
    username: comment.created_by,
    children: <p>{comment.comment}</p>,
  }));
