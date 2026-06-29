/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  EuiBadge,
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DETAIL_PAYLOADS } from '../../mock_data';
import { MetricStat } from './metric_stat';

interface DetailPanelProps {
  nodeId: string;
  onClose: () => void;
}

const metricsGridStyles = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const propertiesGridStyles = css`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  align-items: start;
`;

const sectionLabelStyles = css`
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 700;
`;

const tagsWrapStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <EuiText css={sectionLabelStyles} color="subdued">
    {children}
  </EuiText>
);

export const DetailPanel = ({ nodeId, onClose }: DetailPanelProps) => {
  const payload = DETAIL_PAYLOADS[nodeId];

  return (
    <EuiFlyout
      type="overlay"
      side="right"
      size="400px"
      onClose={onClose}
      ownFocus={false}
      outsideClickCloses={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h3>{payload ? payload.title : 'Node details'}</h3>
        </EuiTitle>
        {payload && (
          <EuiText size="xs" color="subdued">
            {payload.subtitle}
          </EuiText>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {!payload ? (
          <EuiText size="s" color="subdued">
            No details available for this node.
          </EuiText>
        ) : (
          <>
            {/* Metrics */}
            <div css={metricsGridStyles}>
              <MetricStat label="Throughput" value={payload.throughput} />
              <MetricStat label="Lag" value={payload.lag} />
              <MetricStat label="Errors" value={payload.errors} />
              <MetricStat label="Alerts" value={payload.alerts} />
            </div>

            <EuiHorizontalRule margin="m" />

            {/* Properties */}
            <SectionLabel>Properties</SectionLabel>
            <EuiSpacer size="s" />
            <div css={propertiesGridStyles}>
              <EuiText size="xs" color="subdued">
                Mode
              </EuiText>
              <EuiText size="xs">{payload.mode}</EuiText>
              <EuiText size="xs" color="subdued">
                Schema
              </EuiText>
              <EuiText size="xs">{payload.schema}</EuiText>
              <EuiText size="xs" color="subdued">
                Owner
              </EuiText>
              <EuiText size="xs">{payload.owner}</EuiText>
            </div>

            {payload.streamLang && (
              <>
                <EuiHorizontalRule margin="m" />
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
                  <EuiFlexItem>
                    <SectionLabel>StreamLang</SectionLabel>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="primary"
                      css={css`
                        cursor: pointer;
                        font-weight: 600;
                      `}
                    >
                      Customize
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiCodeBlock language="yaml" fontSize="s" paddingSize="s" isCopyable>
                  {payload.streamLang}
                </EuiCodeBlock>
              </>
            )}

            {payload.sources.length > 0 && (
              <>
                <EuiHorizontalRule margin="m" />
                <SectionLabel>Sources {payload.sources.length}</SectionLabel>
                <EuiSpacer size="s" />
                <div css={tagsWrapStyles}>
                  {payload.sources.map((src) => (
                    <EuiBadge key={src} color="hollow">
                      {src}
                    </EuiBadge>
                  ))}
                </div>
              </>
            )}

            {payload.outgoing.length > 0 && (
              <>
                <EuiHorizontalRule margin="m" />
                <SectionLabel>Outgoing {payload.outgoing.length}</SectionLabel>
                <EuiSpacer size="s" />
                <div css={tagsWrapStyles}>
                  {payload.outgoing.map((dst) => (
                    <EuiBadge key={dst} color="hollow">
                      {dst}
                    </EuiBadge>
                  ))}
                </div>
              </>
            )}

            <EuiHorizontalRule margin="m" />
            <SectionLabel>Actions</SectionLabel>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
