/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiText, EuiAvatar } from '@elastic/eui';

import type { CommentsArray } from '@kbn/securitysolution-io-ts-list-types';

import { css } from '@emotion/react';

import moment from 'moment';
import * as i18n from './translations';
import { WithCopyToClipboard } from '../../common/lib/clipboard/with_copy_to_clipboard';

const commentCss = css`
  white-space: pre-wrap;
`;

/**
 * Formats ExceptionItem.comments into EuiCommentList format
 *
 * @param comments ExceptionItem.comments
 */
export const getFormattedComments = (comments: CommentsArray): EuiCommentProps[] =>
  comments.map((commentItem) => ({
    username: commentItem.created_by,
    timestamp: moment(commentItem.created_at).format('on MMM Do YYYY @ HH:mm:ss'),
    event: i18n.COMMENT_EVENT,
    timelineAvatar: <EuiAvatar size="l" name={commentItem.created_by.toUpperCase()} />,
    children: (
      <EuiText size="s" css={commentCss}>
        {commentItem.comment}
      </EuiText>
    ),
    actions: (
      <WithCopyToClipboard
        data-test-subj="copy-to-clipboard"
        text={commentItem.comment}
        titleSummary={i18n.ADD_TO_CLIPBOARD}
      />
    ),
  }));
