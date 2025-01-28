/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonTitle, useEuiTheme } from '@elastic/eui';
import React from 'react';

const ActionsPlaceholderComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        margin-left: ${euiTheme.size.m};
        width: 400px;
      `}
      data-test-subj="actionsPlaceholder"
    >
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={true}>
          <EuiSkeletonTitle
            css={css`
              inline-size: 100%;
              width: 120px;
            `}
            data-test-subj="skeletonTitle1"
            isLoading={true}
            size="s"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={true}>
          <EuiSkeletonTitle
            css={css`
              inline-size: 100%;
              width: 120px;
            `}
            data-test-subj="skeletonTitle2"
            isLoading={true}
            size="s"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSkeletonTitle
            css={css`
              inline-size: 100%;
              width: 120px;
            `}
            data-test-subj="skeletonTitle3"
            isLoading={true}
            size="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

ActionsPlaceholderComponent.displayName = 'ActionsPlaceholder';

export const ActionsPlaceholder = React.memo(ActionsPlaceholderComponent);
