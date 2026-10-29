/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCommentList, EuiText } from '@elastic/eui';
import type { CommentsArray } from '@kbn/securitysolution-io-ts-list-types';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { getFormattedComments } from '../../artifact_entry_card/utils/get_formatted_comments';

export interface ArtifactViewCommentsProps {
  comments: CommentsArray;
  'data-test-subj'?: string;
}

export const ArtifactViewComments = memo<ArtifactViewCommentsProps>(
  ({ comments, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const formattedComments = useMemo(() => getFormattedComments(comments), [comments]);

    if (comments.length === 0) {
      return (
        <EuiText size="s" data-test-subj={getTestId('none')}>
          {getEmptyValue()}
        </EuiText>
      );
    }

    return <EuiCommentList comments={formattedComments} data-test-subj={getTestId('list')} />;
  }
);
ArtifactViewComments.displayName = 'ArtifactViewComments';
