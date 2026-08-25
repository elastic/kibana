/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { ApprovalActor } from './types';

interface ApprovalActorRowProps {
  actor: ApprovalActor;
}

export const ApprovalActorRow = memo<ApprovalActorRowProps>(({ actor }) => {
  const { euiTheme } = useEuiTheme();
  const { iconType = 'bullseye', name, detail } = actor;

  return (
    <>
      <EuiHorizontalRule
        margin="m"
        css={css({ borderTopStyle: 'dashed', borderTopColor: euiTheme.colors.borderBasePlain })}
      />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} color="subdued" size="m" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <strong>{name}</strong>
            {' — '}
            {detail}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

ApprovalActorRow.displayName = 'ApprovalActorRow';
