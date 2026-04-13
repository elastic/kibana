/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSplitButton,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { CardLogoIcon } from './pages/ingest_hub/ingest_hub_components';
import { API_ENDPOINTS } from './pages/ingest_hub/ingest_hub_data';

export interface Version2ApiEndpointsSplitProps {
  /** Lowercased trimmed filter string, or empty for full list */
  searchQuery: string;
  selectedEndpointId: string;
  onSelectEndpoint: (id: string) => void;
  prependBasePath?: (path: string) => string;
  /** Prefix for `data-test-subj` attributes */
  dataTestSubjPrefix?: string;
  /** When set, the primary create action calls this instead of navigating to Stack Management or Fleet. */
  onCreateApiKey?: () => void;
  /** When set, replaces each endpoint’s `sampleSecret` in the secret code block. */
  secretsByEndpointId?: Record<string, string>;
}

export const Version2ApiEndpointsSplit: React.FC<Version2ApiEndpointsSplitProps> = ({
  searchQuery,
  selectedEndpointId,
  onSelectEndpoint,
  prependBasePath,
  dataTestSubjPrefix = 'obsOnboardingV2ApiEndpoints',
  onCreateApiKey,
  secretsByEndpointId,
}) => {
  const { euiTheme } = useEuiTheme();
  const q = searchQuery;
  const filteredEndpoints = !q
    ? API_ENDPOINTS
    : API_ENDPOINTS.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q)
      );

  const [splitPanelOpen, setSplitPanelOpen] = useState(false);

  useEffect(() => {
    setSplitPanelOpen(false);
  }, [selectedEndpointId, q]);

  if (filteredEndpoints.length === 0) {
    return <EuiText color="subdued">No API endpoints match your search.</EuiText>;
  }

  const selected =
    filteredEndpoints.find((e) => e.id === selectedEndpointId) ?? filteredEndpoints[0];
  const origin = window.location.origin;
  const endpointUrl = selected.getEndpointUrl(origin);
  const keysHref =
    prependBasePath?.('/app/management/security/api_keys') ?? '/app/management/security/api_keys';
  const secretValue = secretsByEndpointId?.[selected.id];
  const isEnrollment = selected.keyType === 'enrollment_token';
  const secretEmptyPlaceholder = isEnrollment ? 'No enrollment token yet' : 'No API key yet';
  const displayedSecret = secretValue ?? selected.sampleSecret ?? secretEmptyPlaceholder;
  const secretIsMissing = displayedSecret === secretEmptyPlaceholder;
  const endpointFieldLabel = selected.id === 'endpoint-cloud-id' ? 'Cloud ID' : 'Endpoint';
  const secretFieldLabel = isEnrollment ? 'Enrollment token' : 'API key';
  const createPrimaryLabel = isEnrollment ? 'Create enrollment token' : 'Create API key';
  const createPrimaryHref = onCreateApiKey
    ? undefined
    : isEnrollment && selected.openUrl
    ? selected.openUrl(origin)
    : keysHref;
  const showManageApiKeys = selected.keyType === 'api_key' || selected.keyType === 'kibana_note';
  const showOpenFleetWithFlyout =
    isEnrollment && Boolean(selected.openUrl) && onCreateApiKey !== undefined;
  const fleetUrl = selected.openUrl?.(origin);
  /** Same max height for every endpoint so the detail card does not resize when switching. */
  const codeBlockFixedHeightPx = 56;
  const codeBlockShortCss = css`
    min-inline-size: 0;
    min-block-size: ${codeBlockFixedHeightPx}px;
    max-block-size: ${codeBlockFixedHeightPx}px;
    .euiCodeBlock__pre {
      display: flex;
      align-items: center;
      overflow: hidden;
      min-block-size: ${codeBlockFixedHeightPx}px;
      max-block-size: ${codeBlockFixedHeightPx}px;
    }
    .euiCodeBlock__code {
      flex: 1 1 auto;
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  const secretCodeSubduedCss = secretIsMissing
    ? css`
        .euiCodeBlock__pre,
        .euiCodeBlock__code {
          color: ${euiTheme.colors.textSubdued};
        }
      `
    : undefined;

  return (
    <EuiPanel
      data-test-subj={`${dataTestSubjPrefix}Split`}
      color="subdued"
      hasBorder={false}
      hasShadow={false}
      paddingSize="l"
      grow={false}
    >
      <EuiFlexGroup gutterSize="l" alignItems="stretch" responsive={true}>
        <EuiFlexItem
          grow={false}
          style={{
            flexShrink: 0,
            width: 220,
            minWidth: 200,
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <EuiListGroup
            flush
            gutterSize="none"
            data-test-subj={`${dataTestSubjPrefix}List`}
            style={{ gap: 4, flex: 1, minHeight: 0 }}
          >
            {filteredEndpoints.map((endpoint) => {
              const isEndpointActive = selected.id === endpoint.id;
              return (
                <EuiListGroupItem
                  key={endpoint.id}
                  size="s"
                  css={
                    isEndpointActive
                      ? css`
                          border-radius: ${euiTheme.border.radius.large};
                          overflow: hidden;
                        `
                      : undefined
                  }
                  label={
                    <EuiTitle size="xs">
                      <h4>{endpoint.name}</h4>
                    </EuiTitle>
                  }
                  isActive={isEndpointActive}
                  icon={
                    <span style={{ marginInlineEnd: euiTheme.size.m }}>
                      <CardLogoIcon src={endpoint.logoUrl} alt="" size="list" />
                    </span>
                  }
                  onClick={() => onSelectEndpoint(endpoint.id)}
                />
              );
            })}
          </EuiListGroup>
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          style={{
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
          }}
        >
          <EuiPanel
            data-test-subj={`${dataTestSubjPrefix}Detail`}
            hasBorder={false}
            hasShadow={false}
            color="plain"
            paddingSize="l"
            grow={false}
            css={css`
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
              height: 100%;
            `}
          >
            <EuiFlexGroup
              alignItems="flexStart"
              justifyContent="spaceBetween"
              gutterSize="none"
              responsive={true}
              css={css`
                margin-bottom: 16px;
                gap: 16px;
              `}
            >
              <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                <EuiText
                  size="s"
                  color="subdued"
                  css={css`
                    p {
                      margin: 0;
                      display: -webkit-box;
                      -webkit-line-clamp: 2;
                      -webkit-box-orient: vertical;
                      overflow: hidden;
                    }
                  `}
                >
                  <p>{selected.details}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {showManageApiKeys ? (
                  <EuiSplitButton
                    size="s"
                    color="primary"
                    fill={false}
                    data-test-subj={`${dataTestSubjPrefix}CreateSplit`}
                  >
                    <EuiSplitButton.ActionPrimary
                      data-test-subj={`${dataTestSubjPrefix}CreateApiKey`}
                      type={onCreateApiKey ? 'button' : undefined}
                      href={createPrimaryHref}
                      onClick={onCreateApiKey ? () => onCreateApiKey() : undefined}
                    >
                      {createPrimaryLabel}
                    </EuiSplitButton.ActionPrimary>
                    <EuiSplitButton.ActionSecondary
                      data-test-subj={`${dataTestSubjPrefix}ActionsMenu`}
                      aria-label="More endpoint actions"
                      onClick={() => setSplitPanelOpen((open) => !open)}
                      popoverProps={{
                        isOpen: splitPanelOpen,
                        closePopover: () => setSplitPanelOpen(false),
                        panelPaddingSize: 'none',
                        repositionOnScroll: true,
                        children: (
                          <EuiContextMenuPanel
                            size="s"
                            items={[
                              <EuiContextMenuItem
                                key="manage"
                                data-test-subj={`${dataTestSubjPrefix}ManageKeys`}
                                icon="key"
                                href={keysHref}
                                onClick={() => setSplitPanelOpen(false)}
                              >
                                Manage API keys
                              </EuiContextMenuItem>,
                            ]}
                          />
                        ),
                      }}
                    />
                  </EuiSplitButton>
                ) : showOpenFleetWithFlyout && fleetUrl ? (
                  <EuiSplitButton
                    size="s"
                    color="primary"
                    fill={false}
                    data-test-subj={`${dataTestSubjPrefix}FleetCreateSplit`}
                  >
                    <EuiSplitButton.ActionPrimary
                      data-test-subj={`${dataTestSubjPrefix}CreateApiKey`}
                      type="button"
                      onClick={() => {
                        onCreateApiKey();
                      }}
                    >
                      {createPrimaryLabel}
                    </EuiSplitButton.ActionPrimary>
                    <EuiSplitButton.ActionSecondary
                      data-test-subj={`${dataTestSubjPrefix}ActionsMenu`}
                      aria-label="More Fleet actions"
                      onClick={() => setSplitPanelOpen((open) => !open)}
                      popoverProps={{
                        isOpen: splitPanelOpen,
                        closePopover: () => setSplitPanelOpen(false),
                        panelPaddingSize: 'none',
                        repositionOnScroll: true,
                        children: (
                          <EuiContextMenuPanel
                            size="s"
                            items={[
                              <EuiContextMenuItem
                                key="open-fleet"
                                data-test-subj={`${dataTestSubjPrefix}OpenFleet`}
                                icon="popout"
                                href={fleetUrl}
                                onClick={() => setSplitPanelOpen(false)}
                              >
                                Open Fleet
                              </EuiContextMenuItem>,
                            ]}
                          />
                        ),
                      }}
                    />
                  </EuiSplitButton>
                ) : (
                  <EuiButton
                    data-test-subj={`${dataTestSubjPrefix}CreateApiKey`}
                    size="s"
                    color="primary"
                    type={onCreateApiKey ? 'button' : undefined}
                    href={createPrimaryHref}
                    onClick={onCreateApiKey ? () => onCreateApiKey() : undefined}
                  >
                    {createPrimaryLabel}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={true}>
              <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                <EuiFormRow label={endpointFieldLabel} fullWidth style={{ rowGap: 8 }}>
                  <EuiCodeBlock
                    language="text"
                    fontSize="s"
                    paddingSize="s"
                    isCopyable
                    whiteSpace="pre"
                    title={endpointUrl}
                    data-test-subj={`${dataTestSubjPrefix}EndpointCode`}
                    css={codeBlockShortCss}
                  >
                    {endpointUrl}
                  </EuiCodeBlock>
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                <EuiFormRow label={secretFieldLabel} fullWidth style={{ rowGap: 8 }}>
                  <EuiCodeBlock
                    language="text"
                    fontSize="s"
                    paddingSize="s"
                    isCopyable={!secretIsMissing}
                    whiteSpace="pre"
                    title={displayedSecret}
                    data-test-subj={`${dataTestSubjPrefix}SecretCode`}
                    css={
                      secretCodeSubduedCss
                        ? [codeBlockShortCss, secretCodeSubduedCss]
                        : codeBlockShortCss
                    }
                  >
                    {displayedSecret}
                  </EuiCodeBlock>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div
              aria-hidden
              css={css`
                flex: 1;
                min-height: 0;
              `}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
