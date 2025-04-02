/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  useEuiTheme,
  EuiBadge,
  EuiPanel,
} from '@elastic/eui';
import { BenchmarkIcons } from '../findings_flyout';

interface FindingsMisconfigurationFlyoutHeaderProps {
  ruleName: string;
  timestamp?: Date;
  rulesTags?: string[];
  resourceName?: string;
  framework?: string[];
  vendor?: string;
  ruleBenchmarkId?: string;
  ruleBenchmarkName?: string;
}

export const FindingsMisconfigurationFlyoutHeader = ({
  ruleName,
  timestamp,
  rulesTags,
  resourceName,
  framework,
  vendor,
  ruleBenchmarkId,
  ruleBenchmarkName,
}: FindingsMisconfigurationFlyoutHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="s" />
      {rulesTags &&
        rulesTags.map((tag) => (
          <EuiBadge key={tag} color={'hollow'}>
            {tag}
          </EuiBadge>
        ))}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiPanel hasBorder={false}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem>
                <EuiPanel
                  borderRadius="none"
                  paddingSize="xl"
                  css={{ borderRight: 'solid 1px #D3DAE6', padding: '12px' }}
                  hasBorder={false}
                  hasShadow={false}
                >
                  <EuiFlexGroup direction="column" gutterSize="m">
                    <EuiFlexItem>
                      <b>Resource Name</b>
                    </EuiFlexItem>
                    <EuiFlexItem> {resourceName} </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel
                  borderRadius="none"
                  paddingSize="xl"
                  css={{ borderRight: 'solid 1px #D3DAE6', padding: '12px' }}
                  hasBorder={false}
                  hasShadow={false}
                >
                  <EuiFlexGroup direction="column" gutterSize="m">
                    <EuiFlexItem>
                      <b>Framework</b>
                      <EuiSpacer size="m" />
                      {ruleBenchmarkId && ruleBenchmarkName && (
                        <BenchmarkIcons
                          benchmarkId={ruleBenchmarkId}
                          benchmarkName={ruleBenchmarkName}
                          size={'l'}
                        />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem> {framework} </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel
                  borderRadius="none"
                  paddingSize="xl"
                  css={{ padding: '12px' }}
                  hasBorder={false}
                  hasShadow={false}
                >
                  <EuiFlexGroup direction="column" gutterSize="m">
                    <EuiFlexItem>
                      <b>Vendor</b>
                    </EuiFlexItem>
                    <EuiFlexItem> {vendor} </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          margin: ${euiTheme.size.s};
        `}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default FindingsMisconfigurationFlyoutHeader;
