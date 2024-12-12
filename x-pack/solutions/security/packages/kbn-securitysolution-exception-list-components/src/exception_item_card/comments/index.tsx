/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiAccordion, EuiCommentList, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import * as i18n from '../translations';

const accordionCss = css`
  color: ${euiThemeVars.euiColorPrimary};
`;

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
            <EuiText size="s" css={accordionCss} data-test-subj={`${dataTestSubj || ''}TextButton`}>
              {i18n.exceptionItemCardCommentsAccordion(comments.length)}
            </EuiText>
          }
          arrowDisplay="none"
          data-test-subj="exceptionItemCardComments"
        >
          <EuiPanel data-test-subj="accordionContentPanel" hasBorder hasShadow paddingSize="m">
            <EuiCommentList data-test-subj="accordionCommentList" comments={comments} />
          </EuiPanel>
        </EuiAccordion>
      </EuiFlexItem>
    );
  }
);

ExceptionItemCardComments.displayName = 'ExceptionItemCardComments';
