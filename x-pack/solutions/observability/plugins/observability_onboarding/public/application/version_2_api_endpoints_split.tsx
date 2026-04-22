/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFormLabel,
  EuiPanel,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiToolTip,
  euiFontSize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';
import { CardLogoIcon } from './pages/ingest_hub/ingest_hub_components';
import { API_ENDPOINTS } from './pages/ingest_hub/ingest_hub_data';
import { Version2ApiEndpointsCreateApiKeyButton } from './version_2_api_endpoints_create_api_key_button';

/** Single-line endpoint / secret row (aligned fields, minimal vertical padding). */
const CODE_BLOCK_FIXED_HEIGHT_PX = 36;

/**
 * Vertical space after the tab strip (divider) before the detail title.
 * Reused below the use-case badges before the Endpoint / API key fields so spacing matches.
 */
const API_ENDPOINT_PANEL_SECTION_GAP_PX = 16;

/** Expanded label width for the selected tab (icon-only tabs collapse label via `max-width: 0`). */
const TAB_SELECTED_NAME_MAX_WIDTH_PX = 240;

export interface Version2ApiEndpointsSplitProps {
  /** Lowercased trimmed filter string, or empty for full list */
  searchQuery: string;
  selectedEndpointId: string;
  onSelectEndpoint: (id: string) => void;
  /** Prefix for `data-test-subj` attributes */
  dataTestSubjPrefix?: string;
  /** When set, replaces each endpoint’s `sampleSecret` in the secret code block. */
  secretsByEndpointId?: Record<string, string>;
  /** Link to Stack Management → API keys (Create API key flyout + Manage). */
  apiKeyManageHref: string;
  /** Called when the user creates an API key from the flyout (non-enrollment endpoints). */
  onApiKeyCreated: (result: CreateAPIKeyResult) => void;
  /** `data-test-subj` for the Create API key split control (without suffix). */
  createApiKeyDataTestSubj: string;
}

export const Version2ApiEndpointsSplit: React.FC<Version2ApiEndpointsSplitProps> = ({
  searchQuery,
  selectedEndpointId,
  onSelectEndpoint,
  dataTestSubjPrefix = 'obsOnboardingV2ApiEndpoints',
  secretsByEndpointId,
  apiKeyManageHref,
  onApiKeyCreated,
  createApiKeyDataTestSubj,
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const endpointCodeLabelId = useGeneratedHtmlId({ prefix: 'obsOnboardingV2EndpointLabel' });
  const secretCodeLabelId = useGeneratedHtmlId({ prefix: 'obsOnboardingV2SecretLabel' });
  const q = searchQuery;
  const filteredEndpoints = useMemo(
    () =>
      !q
        ? API_ENDPOINTS
        : API_ENDPOINTS.filter(
            (e) =>
              e.name.toLowerCase().includes(q) ||
              e.detailTitle.toLowerCase().includes(q) ||
              e.description.toLowerCase().includes(q) ||
              e.details.toLowerCase().includes(q) ||
              e.useCaseBullets.some((b) => b.toLowerCase().includes(q))
          ),
    [q]
  );

  if (filteredEndpoints.length === 0) {
    return <EuiText color="subdued">No API endpoints match your search.</EuiText>;
  }

  const selected =
    filteredEndpoints.find((e) => e.id === selectedEndpointId) ?? filteredEndpoints[0];
  const origin = window.location.origin;
  const endpointUrl = selected.getEndpointUrl(origin);
  const secretValue = secretsByEndpointId?.[selected.id];
  const isEnrollment = selected.keyType === 'enrollment_token';
  const secretEmptyPlaceholder = isEnrollment ? 'No enrollment token yet' : 'No API key yet';
  const displayedSecret = secretValue ?? selected.sampleSecret ?? secretEmptyPlaceholder;
  const secretIsMissing = displayedSecret === secretEmptyPlaceholder;
  const endpointFieldLabel = selected.id === 'endpoint-cloud-id' ? 'Cloud ID' : 'Endpoint';
  const secretFieldLabel = isEnrollment ? 'Enrollment token' : 'API key';
  const fleetUrl = selected.openUrl?.(origin);
  /** Fixed code block row height so endpoint / secret fields stay aligned. */
  const codeBlockShortCss = css`
    &.euiCodeBlock {
      padding-block: 0 !important;
      box-sizing: border-box;
      inline-size: 100%;
      max-inline-size: 100%;
    }
    min-block-size: ${CODE_BLOCK_FIXED_HEIGHT_PX}px;
    max-block-size: ${CODE_BLOCK_FIXED_HEIGHT_PX}px;
    min-inline-size: 0;
    .euiCodeBlock__pre {
      box-sizing: border-box;
      inline-size: 100%;
      min-inline-size: 0;
      block-size: ${CODE_BLOCK_FIXED_HEIGHT_PX}px;
      min-block-size: ${CODE_BLOCK_FIXED_HEIGHT_PX}px;
      max-block-size: ${CODE_BLOCK_FIXED_HEIGHT_PX}px;
      padding-block: 0 !important;
      padding-inline: ${euiTheme.size.s};
      display: flex;
      align-items: center;
      overflow: hidden;
      white-space: nowrap !important;
    }
    .euiCodeBlock__code {
      flex: 1 1 auto;
      min-inline-size: 0;
      max-inline-size: 100%;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap !important;
    }
    .euiCodeBlock__controls {
      inset-block-start: 50%;
      transform: translateY(-50%);
      height: auto;
      align-items: center;
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

  const showSecretRowAction =
    (isEnrollment && Boolean(fleetUrl)) ||
    selected.keyType === 'api_key' ||
    selected.keyType === 'kibana_note';

  /**
   * Logo tabs: 8px gap; 8px under the logo before the tab divider.
   * `EuiToolTip` sits between `.euiTab__content` and `[data-endpoint-tab-content]`, so use tab
   * `padding-bottom` instead of a direct-child margin selector (which never matched).
   */
  const tabLogoTabsCss = css`
    flex-shrink: 0;
    align-self: stretch;
    margin-bottom: ${API_ENDPOINT_PANEL_SECTION_GAP_PX}px;
    align-items: flex-start;
    gap: 8px;
    .euiTab {
      align-items: flex-start;
      padding-top: 4px;
      padding-inline: 4px;
      padding-bottom: 8px;
      transition: color ${euiTheme.animation.fast} ease-out;
    }
    .euiTab .euiTab__content {
      overflow: visible;
      text-overflow: clip;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      line-height: ${euiFontSize(euiThemeContext, 's').lineHeight};
    }
    .euiTab-isSelected [data-endpoint-tab-logo] {
      display: inline-flex;
      line-height: 0;
    }
  `;

  return (
    <EuiPanel
      data-test-subj={`${dataTestSubjPrefix}Split ${dataTestSubjPrefix}Detail`}
      hasBorder={true}
      hasShadow={false}
      color="plain"
      paddingSize="l"
      grow={false}
      css={css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        align-self: stretch;
        text-align: start;
        min-width: 0;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      `}
    >
      <EuiTabs size="s" data-test-subj={`${dataTestSubjPrefix}Tabs`} css={tabLogoTabsCss}>
        {filteredEndpoints.map((endpoint) => {
          const isTabSelected = selected.id === endpoint.id;
          const nameMaxWidthPx = isTabSelected ? TAB_SELECTED_NAME_MAX_WIDTH_PX : 0;

          return (
            <EuiTab
              key={endpoint.id}
              isSelected={isTabSelected}
              onClick={() => onSelectEndpoint(endpoint.id)}
              aria-label={endpoint.name}
              data-test-subj={`${dataTestSubjPrefix}Tab--${endpoint.id}`}
            >
              <EuiToolTip
                content={endpoint.name}
                position="top"
                repositionOnScroll
                disableScreenReaderOutput
              >
                <span
                  data-endpoint-tab-content
                  css={css`
                    display: inline-flex;
                    align-items: center;
                    gap: ${euiTheme.size.s};
                    line-height: 0;
                  `}
                >
                  <span data-endpoint-tab-logo>
                    <CardLogoIcon
                      src={endpoint.logoUrl}
                      alt=""
                      logoEuiIcon={endpoint.logoEuiIcon}
                      size="default"
                      iconBackground="plain"
                      tileBorderColor={
                        isTabSelected ? euiTheme.colors.borderStrongPrimary : undefined
                      }
                      tileBackgroundColor={
                        isTabSelected ? euiTheme.colors.backgroundLightPrimary : undefined
                      }
                    />
                  </span>
                  <span
                    data-endpoint-tab-name
                    data-test-subj={`${dataTestSubjPrefix}TabSelectedName--${endpoint.id}`}
                    aria-hidden={!isTabSelected}
                    css={css`
                      display: inline-block;
                      min-width: 0;
                      max-width: ${nameMaxWidthPx}px;
                      overflow: hidden;
                      white-space: nowrap;
                      text-overflow: ellipsis;
                      font-size: ${euiFontSize(euiThemeContext, 's').fontSize};
                      font-weight: ${euiTheme.font.weight.medium};
                      color: ${euiTheme.colors.textPrimary};
                      line-height: ${euiFontSize(euiThemeContext, 's').lineHeight};
                      vertical-align: middle;
                      pointer-events: ${isTabSelected ? 'auto' : 'none'};
                    `}
                  >
                    {endpoint.name}
                  </span>
                </span>
              </EuiToolTip>
            </EuiTab>
          );
        })}
      </EuiTabs>
      <div
        data-test-subj={`${dataTestSubjPrefix}EndpointSecretGrid`}
        css={css`
          display: grid;
          align-self: stretch;
          justify-items: stretch;
          width: 100%;
          min-width: 0;
          margin-top: ${API_ENDPOINT_PANEL_SECTION_GAP_PX}px;
          column-gap: ${euiTheme.size.m};
          row-gap: ${euiTheme.size.s};
          grid-template-columns: ${showSecretRowAction
            ? `minmax(0, 1fr) minmax(0, 1fr) max-content`
            : `minmax(0, 1fr) minmax(0, 1fr)`};
          grid-template-areas: ${showSecretRowAction
            ? `"epLabel secLabel ." "epCode secCode action"`
            : `"epLabel secLabel" "epCode secCode"`};

          @media (max-width: ${euiTheme.breakpoint.m}px) {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas: ${showSecretRowAction
              ? `"epLabel" "epCode" "secLabel" "secCode" "action"`
              : `"epLabel" "epCode" "secLabel" "secCode"`};
          }
        `}
      >
        <EuiFormLabel
          id={endpointCodeLabelId}
          css={css`
            grid-area: epLabel;
            margin-block: 0;
          `}
        >
          {endpointFieldLabel}
        </EuiFormLabel>
        <EuiFormLabel
          id={secretCodeLabelId}
          css={css`
            grid-area: secLabel;
            margin-block: 0;
          `}
        >
          {secretFieldLabel}
        </EuiFormLabel>
        <div
          css={css`
            grid-area: epCode;
            min-width: 0;
            min-inline-size: 0;
            inline-size: 100%;
          `}
        >
          <EuiCodeBlock
            language="text"
            fontSize="s"
            paddingSize="none"
            isCopyable
            title={endpointUrl}
            aria-labelledby={endpointCodeLabelId}
            data-test-subj={`${dataTestSubjPrefix}EndpointCode`}
            css={codeBlockShortCss}
          >
            {endpointUrl}
          </EuiCodeBlock>
        </div>
        <div
          css={css`
            grid-area: secCode;
            min-width: 0;
            min-inline-size: 0;
            inline-size: 100%;
          `}
        >
          <EuiCodeBlock
            language="text"
            fontSize="s"
            paddingSize="none"
            isCopyable={!secretIsMissing}
            title={displayedSecret}
            aria-labelledby={secretCodeLabelId}
            data-test-subj={`${dataTestSubjPrefix}SecretCode`}
            css={
              secretCodeSubduedCss ? [codeBlockShortCss, secretCodeSubduedCss] : codeBlockShortCss
            }
          >
            {displayedSecret}
          </EuiCodeBlock>
        </div>
        {showSecretRowAction ? (
          <div
            data-test-subj={`${dataTestSubjPrefix}SecretRowAction`}
            css={css`
              grid-area: action;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              align-self: center;
              min-width: 0;

              @media (max-width: ${euiTheme.breakpoint.m}px) {
                justify-self: end;
              }
            `}
          >
            {isEnrollment && fleetUrl ? (
              <EuiButton
                data-test-subj={`${dataTestSubjPrefix}CreateEnrollmentToken`}
                size="s"
                color="primary"
                href={fleetUrl}
              >
                Create enrollment token
              </EuiButton>
            ) : (
              <Version2ApiEndpointsCreateApiKeyButton
                dataTestSubj={createApiKeyDataTestSubj}
                manageApiKeysHref={apiKeyManageHref}
                onCreated={onApiKeyCreated}
              />
            )}
          </div>
        ) : null}
      </div>
    </EuiPanel>
  );
};
