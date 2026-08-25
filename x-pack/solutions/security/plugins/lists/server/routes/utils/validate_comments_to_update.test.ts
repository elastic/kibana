/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateCommentsToUpdate } from './validate_comments_to_update';

describe('update_exception_list_item_validation', () => {
  describe('#validateComments', () => {
    test('it returns no errors if new comments are append only', () => {
      const comments = [{ comment: 'Im an old comment', id: '1' }, { comment: 'Im a new comment' }];
      const output = validateCommentsToUpdate(comments);

      expect(output).toEqual([]);
    });

    test('it returns error if comments are not append only', () => {
      const comments = [
        { comment: 'Im an old comment', id: '1' },
        { comment: 'Im a new comment modifying the order of existing comments' },
        { comment: 'Im an old comment', id: '2' },
      ];
      const output = validateCommentsToUpdate(comments);

      expect(output).toEqual(['item "comments" are append only']);
    });
  });
});
