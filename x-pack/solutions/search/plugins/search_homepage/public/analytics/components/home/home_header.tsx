/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, Ref } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { focusTargetHeading, readableLine } from '../shared/shared_styles';

interface HomeHeaderProps {
  title: string;
  description?: string;
  /** Compact facts about the deployment, e.g. "1.2M events · 3 sources". */
  summary?: string;
  /** Receives focus when the page switches to this view. */
  headingRef: Ref<HTMLHeadingElement>;
  action?: ReactNode;
}

export const HomeHeader = ({
  title,
  description,
  summary,
  headingRef,
  action,
}: HomeHeaderProps): React.JSX.Element => (
  <>
    <EuiFlexGroup gutterSize="m" alignItems="flexStart" justifyContent="spaceBetween" wrap>
      <EuiFlexItem css={readableLine}>
        <EuiTitle size="l">
          <h1 ref={headingRef} tabIndex={-1} css={focusTargetHeading}>
            {title}
          </h1>
        </EuiTitle>
        {description !== undefined && (
          <>
            <EuiSpacer size="s" />
            <EuiText color="subdued">
              <p>{description}</p>
            </EuiText>
          </>
        )}
        {summary !== undefined && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued" data-test-subj="analyticsHomeSummary">
              <p>{summary}</p>
            </EuiText>
          </>
        )}
      </EuiFlexItem>
      {action !== undefined && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);
