/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateExceptionListItemCommentArray } from '@kbn/securitysolution-exceptions-common/api';

export const validateCommentsToUpdate = (
  comments: UpdateExceptionListItemCommentArray
): string[] => {
  const [appendOnly] = comments.reduce(
    (acc, comment) => {
      const [, hasNewComments] = acc;
      if (comment.id == null) {
        return [true, true];
      }

      if (hasNewComments && comment.id != null) {
        return [false, true];
      }

      return acc;
    },
    [true, false]
  );
  if (!appendOnly) {
    return ['item "comments" are append only'];
  } else {
    return [];
  }
};
