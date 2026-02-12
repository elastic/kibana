/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

export const EndpointScriptDetailItem = memo(
  ({
    label,
    appendToLabel,
    children,
  }: {
    label: string;
    appendToLabel?: React.ReactNode;
    children: React.ReactNode | React.ReactNode[];
  }) => {
    return (
      <>
        <EuiFlexGroup alignItems="flexStart" gutterSize="xs" direction="row" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>{label}</h5>
            </EuiText>
          </EuiFlexItem>
          {appendToLabel ? <EuiFlexItem grow={false}>{appendToLabel}</EuiFlexItem> : null}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        {children}
      </>
    );
  }
);

EndpointScriptDetailItem.displayName = 'EndpointScriptDetailItem';
