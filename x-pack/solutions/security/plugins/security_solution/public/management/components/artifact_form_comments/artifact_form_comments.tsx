/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import type { CommentsArray, CreateCommentsArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionItemComments } from '../../../detection_engine/rule_exceptions/components/item_comments';
import type { ArtifactFormComponentProps } from '../artifact_list_page';

export interface ArtifactFormCommentsProps {
  /** The artifact being created or edited. Its existing comments are captured on mount. */
  item: ArtifactFormComponentProps['item'];
  /**
   * Receives the comments to set on the item: the new comment, or an empty list when there is none.
   * Existing comments are never sent, as the server appends new comments to the stored ones.
   */
  onChange: (comments: CreateCommentsArray) => void;
  onErrorChange: (hasError: boolean) => void;
  'data-test-subj'?: string;
}

const getExistingComments = (item: ArtifactFormComponentProps['item']): CommentsArray =>
  'id' in item ? item.comments : [];

/**
 * Lists the existing comments of an artifact and lets the user add a new one.
 */
export const ArtifactFormComments = memo<ArtifactFormCommentsProps>(
  ({ item, onChange, onErrorChange, 'data-test-subj': dataTestSubj }) => {
    const [existingComments] = useState(() => getExistingComments(item));
    const [newComment, setNewComment] = useState('');

    const handleOnNewCommentChange = useCallback(
      (value: string) => {
        setNewComment(value);
        onChange(value.trim() ? [{ comment: value }] : []);
      },
      [onChange]
    );

    return (
      <div data-test-subj={dataTestSubj}>
        <ExceptionItemComments
          exceptionItemComments={existingComments}
          newCommentValue={newComment}
          newCommentOnChange={handleOnNewCommentChange}
          setCommentError={onErrorChange}
        />
      </div>
    );
  }
);
ArtifactFormComments.displayName = 'ArtifactFormComments';
