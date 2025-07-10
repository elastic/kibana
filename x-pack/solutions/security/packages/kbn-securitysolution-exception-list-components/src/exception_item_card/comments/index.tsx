/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiAccordion, EuiCommentList, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import * as i18n from '../translations';

export interface ExceptionItemCardCommentsProps {
  comments: EuiCommentProps[];
  dataTestSubj?: string;
}

export const ExceptionItemCardComments = memo<ExceptionItemCardCommentsProps>(
  ({ comments, dataTestSubj }) => {
    if (!comments.length) return null;
    return (
      <EuiFlexItem data-test-subj={dataTestSubj}>
        <EuiAccordion
          id="exceptionItemCardComments"
          buttonContent={
            <EuiText size="s" data-test-subj={`${dataTestSubj || ''}TextButton`}>
              {i18n.exceptionItemCardCommentsAccordion(comments.length)}
            </EuiText>
          }
          arrowDisplay="none"
          data-test-subj="exceptionItemCardComments"
        >
          <EuiPanel data-test-subj="accordionContentPanel" paddingSize="m">
            <EuiCommentList data-test-subj="accordionCommentList" comments={comments} />
          </EuiPanel>
        </EuiAccordion>
      </EuiFlexItem>
    );
  }
);

ExceptionItemCardComments.displayName = 'ExceptionItemCardComments';
