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
  EuiCopy,
  EuiIcon,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { CspFinding } from '@kbn/cloud-security-posture-common';
import { BenchmarkIcons } from '../findings_flyout';

export interface FindingsMisconfigurationFlyoutHeaderProps {
  finding: CspFinding;
}

export const TruncatedCopyableText = ({ textToCopy }: { textToCopy: string }) => {
  return (
    <EuiText
      size="s"
      css={{
        paddingTop: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        css={{
          float: 'left',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          maxWidth: 'calc(100% - 20px)',
          marginRight: '4px',
        }}
      >
        {textToCopy}
      </div>
      <EuiCopy textToCopy={textToCopy}>
        {(copy) => (
          <EuiIcon
            css={css`
              :hover {
                cursor: pointer;
              }
            `}
            onClick={copy}
            type="copy"
          />
        )}
      </EuiCopy>
    </EuiText>
  );
};

export const FindingsMisconfigurationFlyoutHeader = ({
  finding,
}: FindingsMisconfigurationFlyoutHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  const rulesTags = finding?.rule?.tags;
  const resourceName = finding?.resource?.name;
  const vendor = finding?.observer?.vendor;
  const ruleBenchmarkId = finding?.rule?.benchmark?.id;
  const ruleBenchmarkName = finding?.rule?.benchmark?.name;

  return (
    <>
      <EuiSpacer size="s" />
      {rulesTags &&
        rulesTags.map((tag: string) => (
          <EuiBadge key={tag} color={'hollow'}>
            {tag}
          </EuiBadge>
        ))}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
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
                    <EuiFlexItem>
                      <EuiToolTip content={resourceName} position="top">
                        <TruncatedCopyableText textToCopy={resourceName} />
                      </EuiToolTip>
                    </EuiFlexItem>
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
