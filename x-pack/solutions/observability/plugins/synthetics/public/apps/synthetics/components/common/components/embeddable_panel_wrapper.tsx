/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { AddToDashboard } from './add_to_dashboard';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../../../../embeddables/constants';

interface Props {
  title?: string;
  loading?: boolean;
  hideTitle?: boolean;
  titleAppend?: React.ReactNode;
}

export const EmbeddablePanelWrapper: FC<React.PropsWithChildren<Props>> = ({
  children,
  title,
  loading,
  titleAppend,
  hideTitle,
}) => {
  const isSyntheticsApp = window.location.pathname.includes('/app/synthetics');

  const noTitle = !title && !titleAppend;
  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={isSyntheticsApp}>
        {!noTitle && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem grow={true}>
                {(!hideTitle || !title) && (
                  <EuiTitle size="xs">
                    <h3>{title}</h3>
                  </EuiTitle>
                )}
              </EuiFlexItem>
              {isSyntheticsApp && (
                <EuiFlexItem grow={false}>
                  <AddToDashboard type={SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE} />
                </EuiFlexItem>
              )}
              {titleAppend && <EuiFlexItem grow={false}>{titleAppend}</EuiFlexItem>}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}
        {loading && <EuiProgress size="xs" color="accent" />}
        {children}
      </EuiPanel>
    </>
  );
};
