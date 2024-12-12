/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getCommentsArrayMock, getCommentsMock } from './index.mock';
import {
  Comment,
  comment,
  CommentsArray,
  commentsArray,
  CommentsArrayOrUndefined,
  commentsArrayOrUndefined,
} from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { DATE_NOW } from '../../constants/index.mock';

describe('Comment', () => {
  describe('comment', () => {
    test('it fails validation when "id" is undefined', () => {
      const payload = { ...getCommentsMock(), id: undefined };
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "id"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it passes validation with a typical comment', () => {
      const payload = getCommentsMock();
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation with "updated_at" and "updated_by" fields included', () => {
      const payload = getCommentsMock();
      payload.updated_at = DATE_NOW;
      payload.updated_by = 'someone';
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when undefined', () => {
      const payload = undefined;
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>)"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when "comment" is an empty string', () => {
      const payload: Omit<Comment, 'comment'> & { comment: string } = {
        ...getCommentsMock(),
        comment: '',
      };
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "comment"']);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when "comment" is not a string', () => {
      const payload: Omit<Comment, 'comment'> & { comment: string[] } = {
        ...getCommentsMock(),
        comment: ['some value'],
      };
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "["some value"]" supplied to "comment"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when "created_at" is not a string', () => {
      const payload: Omit<Comment, 'created_at'> & { created_at: number } = {
        ...getCommentsMock(),
        created_at: 1,
      };
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "created_at"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when "created_by" is not a string', () => {
      const payload: Omit<Comment, 'created_by'> & { created_by: number } = {
        ...getCommentsMock(),
        created_by: 1,
      };
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "created_by"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when "updated_at" is not a string', () => {
      const payload: Omit<Comment, 'updated_at'> & { updated_at: number } = {
        ...getCommentsMock(),
        updated_at: 1,
      };
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "updated_at"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when "updated_by" is not a string', () => {
      const payload: Omit<Comment, 'updated_by'> & { updated_by: number } = {
        ...getCommentsMock(),
        updated_by: 1,
      };
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "updated_by"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: Comment & {
        extraKey?: string;
      } = getCommentsMock();
      payload.extraKey = 'some value';
      const decoded = comment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getCommentsMock());
    });
  });

  describe('commentsArray', () => {
    test('it passes validation an array of Comment', () => {
      const payload = getCommentsArrayMock();
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation when a Comment includes "updated_at" and "updated_by"', () => {
      const commentsPayload = getCommentsMock();
      commentsPayload.updated_at = DATE_NOW;
      commentsPayload.updated_by = 'someone';
      const payload = [{ ...commentsPayload }, ...getCommentsArrayMock()];
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when undefined', () => {
      const payload = undefined;
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "Array<({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when array includes non Comment types', () => {
      const payload = [1] as unknown as CommentsArray;
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('commentsArrayOrUndefined', () => {
    test('it passes validation an array of Comment', () => {
      const payload = getCommentsArrayMock();
      const decoded = commentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation when undefined', () => {
      const payload = undefined;
      const decoded = commentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when array includes non Comment types', () => {
      const payload = [1] as unknown as CommentsArrayOrUndefined;
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
