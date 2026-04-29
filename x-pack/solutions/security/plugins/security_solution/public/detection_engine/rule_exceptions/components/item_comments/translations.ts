/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNKNOWN_AVATAR_NAME = i18n.translate(
  'xpack.securitySolution.rule_exceptions.itemComments.unknownAvatarName',
  {
    defaultMessage: 'Uknown',
  }
);

export const ADD_COMMENT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.rule_exceptions.itemComments.addCommentPlaceholder',
  {
    defaultMessage: 'Add a new comment...',
  }
);

export const COMMENTS_SHOW = (comments: number) =>
  i18n.translate('xpack.securitySolution.rule_exceptions.itemComments.showCommentsLabel', {
    values: { comments },
    defaultMessage: 'Show ({comments}) {comments, plural, =1 {Comment} other {Comments}}',
  });

export const COMMENTS_HIDE = (comments: number) =>
  i18n.translate('xpack.securitySolution.rule_exceptions.itemComments.hideCommentsLabel', {
    values: { comments },
    defaultMessage: 'Hide ({comments}) {comments, plural, =1 {Comment} other {Comments}}',
  });

export const COMMENT_MAX_LENGTH_ERROR = (length: number) =>
  i18n.translate('xpack.securitySolution.rule_exceptions.itemComments.maxLengthError', {
    values: { length },
    defaultMessage:
      'The length of the comment is too long. The maximum length is {length} characters.',
  });
