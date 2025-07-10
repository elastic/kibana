/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, type CommonProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

/**
 * A wrapper that centers its children both horizontally and vertically.
 */
export const CenteredWrapper = ({
  children,
  ...rest
}: { children: React.ReactNode } & CommonProps) => (
  <EuiFlexGroup
    css={css`
      // 250px is roughly the Kibana chrome with a page title and tabs
      min-height: calc(100vh - 250px);
    `}
    justifyContent="center"
    alignItems="center"
    direction="column"
    {...rest}
  >
    <EuiFlexItem>{children}</EuiFlexItem>
  </EuiFlexGroup>
);
