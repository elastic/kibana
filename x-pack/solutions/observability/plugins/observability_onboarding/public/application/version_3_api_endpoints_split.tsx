/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSideNav,
  type EuiSideNavItemType,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CardLogoIcon } from './pages/ingest_hub/ingest_hub_components';
import { API_ENDPOINTS } from './pages/ingest_hub/ingest_hub_data';
import { ApiEndpointCodeBlockWithStyledCopy } from './api_endpoint_code_block_with_styled_copy';
import { ApiEndpointSecretCodeBlockWithToolbar } from './api_endpoint_secret_code_block_with_toolbar';
import type { Version2ApiEndpointsSplitProps } from './version_2_api_endpoints_split';

/** Compact min height for `// Label` + value (two lines) inside each snippet block. */
const API_ENDPOINT_SNIPPET_BLOCK_MIN_HEIGHT_PX = 46;

/**
 * Version 3 API block: subdued shell, label-only left nav, white detail panel with logo + name title.
 */
export const Version3ApiEndpointsSplit: React.FC<Version2ApiEndpointsSplitProps> = ({
  searchQuery,
  selectedEndpointId,
  onSelectEndpoint,
  dataTestSubjPrefix = 'obsOnboardingV3ApiEndpoints',
  secretsByEndpointId,
  apiKeyManageHref,
  onApiKeyCreated,
  createApiKeyDataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
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

  const selected = useMemo(() => {
    if (filteredEndpoints.length === 0) {
      return null;
    }
    return (
      filteredEndpoints.find((e) => e.id === selectedEndpointId) ?? filteredEndpoints[0] ?? null
    );
  }, [filteredEndpoints, selectedEndpointId]);

  const endpointSideNavItems: Array<EuiSideNavItemType<unknown>> = useMemo(
    () =>
      filteredEndpoints.map((endpoint) => ({
        id: endpoint.id,
        name: endpoint.name,
        isSelected: selected != null && selected.id === endpoint.id,
        onClick: () => {
          onSelectEndpoint(endpoint.id);
        },
        'data-test-subj': `${dataTestSubjPrefix}NavItem--${endpoint.id}`,
      })),
    [dataTestSubjPrefix, filteredEndpoints, onSelectEndpoint, selected]
  );

  const endpointSideNavCss = useMemo(
    () => css`
      width: max-content;
      max-width: 100%;
      padding-block-end: 0;
      margin-block-end: 0;
      .euiSideNav__content {
        padding-block-end: 0;
        margin-block-end: 0;
      }
      .euiSideNavItem__items {
        gap: 0;
        row-gap: 0;
      }
      .euiSideNavItem--trunk {
        margin-block: 0 !important;
        padding-block: 0 !important;
      }
      .euiSideNavItemButton {
        padding-block: 0;
        /* EUI root/trunk adds padding-inline: size.s (~8px) + negative margin for focus hitbox */
        padding-inline: 0 !important;
        margin-inline: 0 !important;
        min-block-size: 0;
      }
      .euiSideNavItem--root {
        margin-top: 0;
        padding-top: 0;
        /* EUI root: padding-bottom size.s between items — last item kept extra block under labels */
        padding-bottom: 0 !important;
        padding-inline: 0 !important;
      }
      .euiSideNavItem--root + .euiSideNavItem--root {
        margin-top: 0;
        padding-top: 0;
        padding-bottom: 0 !important;
      }
      .euiSideNavItem--root > .euiSideNavItem__items {
        margin-top: 0 !important;
        padding-top: 0;
      }
      .euiSideNavItem__items .euiSideNavItem {
        margin-top: 0;
        padding-top: 0;
      }
      .euiSideNavItem--trunk .euiSideNavItemButton:not(.euiSideNavItemButton-isSelected) {
        font-weight: ${euiTheme.font.weight.regular};
        color: ${euiTheme.colors.textSubdued};
      }
    `,
    [euiTheme.colors.textSubdued, euiTheme.font.weight.regular]
  );

  const codeBlockShortCss = css`
    &.euiCodeBlock {
      box-sizing: border-box;
      inline-size: 100%;
      max-inline-size: 100%;
      border-radius: 4px;
      overflow: hidden;
    }
    min-block-size: ${API_ENDPOINT_SNIPPET_BLOCK_MIN_HEIGHT_PX}px;
    min-inline-size: 0;
    .euiCodeBlock__pre {
      box-sizing: border-box;
      inline-size: 100%;
      min-inline-size: 0;
      min-block-size: ${API_ENDPOINT_SNIPPET_BLOCK_MIN_HEIGHT_PX}px;
      block-size: auto;
      padding-block: 4px;
      padding-inline-start: 12px;
      padding-inline-end: 0;
      display: flex;
      align-items: center;
      overflow: hidden;
    }
    .euiCodeBlock__code {
      flex: 1 1 auto;
      min-inline-size: 0;
      min-width: 0;
      max-inline-size: 100%;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: pre-wrap !important;
      word-break: break-all;
    }
    .euiCodeBlock__controls {
      inset-block-start: 50%;
      transform: translateY(-50%);
      height: auto;
      align-items: center;
    }
  `;

  if (!selected) {
    return <EuiText color="subdued">No API endpoints match your search.</EuiText>;
  }

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

  const secretCodeSubduedCss = secretIsMissing
    ? css`
        .euiCodeBlock__pre,
        .euiCodeBlock__code,
        .euiCodeBlock__code .token {
          color: ${euiTheme.colors.textSubdued} !important;
        }
      `
    : undefined;

  const showSecretRowAction =
    (isEnrollment && Boolean(fleetUrl)) ||
    selected.keyType === 'api_key' ||
    selected.keyType === 'kibana_note';

  const endpointSnippetAriaLabel = i18n.translate(
    'xpack.observability_onboarding.version3ApiEndpoints.endpointSnippetAriaLabel',
    {
      defaultMessage: 'Endpoint URL snippet',
    }
  );
  const secretSnippetAriaLabel = i18n.translate(
    'xpack.observability_onboarding.version3ApiEndpoints.secretSnippetAriaLabel',
    {
      defaultMessage: 'API key or enrollment snippet',
    }
  );

  return (
    <EuiPanel
      data-test-subj={`${dataTestSubjPrefix}Split`}
      color="subdued"
      hasBorder={false}
      hasShadow={false}
      paddingSize="l"
      grow={false}
      css={css`
        box-sizing: border-box;
        align-self: stretch;
        min-width: 0;
        max-width: 100%;
        width: 100%;
        flex-grow: 0;
        flex-shrink: 0;
        height: fit-content;
      `}
    >
      {/* Plain flex row: EuiFlexGroup overwrites `css` and defaults to flex-grow:1 */}
      <div
        css={css`
          display: flex;
          flex-flow: row wrap;
          align-items: flex-start;
          gap: ${euiTheme.size.base};
          min-width: 0;
          width: 100%;
        `}
      >
        <div
          style={{
            flex: '0 0 auto',
            width: 'max-content',
            maxWidth: '100%',
            minWidth: 0,
          }}
        >
          <EuiSideNav
            data-test-subj={`${dataTestSubjPrefix}SideNav`}
            heading={i18n.translate(
              'xpack.observabilityOnboarding.version3ApiEndpoints.sideNavHeading',
              { defaultMessage: 'API endpoints' }
            )}
            headingProps={{ screenReaderOnly: true }}
            items={endpointSideNavItems}
            mobileBreakpoints={undefined}
            css={endpointSideNavCss}
          />
        </div>
        <div style={{ flex: '1 1 0%', minWidth: 0, alignSelf: 'stretch' }}>
          <EuiPanel
            data-test-subj={`${dataTestSubjPrefix}Detail`}
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
              .euiFormRow {
                margin-block-end: 0;
              }
            `}
          >
            <div
              data-test-subj={`${dataTestSubjPrefix}DetailHeader`}
              css={css`
                align-self: stretch;
                min-width: 0;
              `}
            >
              <EuiFlexGroup
                responsive={false}
                gutterSize="none"
                alignItems="center"
                style={{ minWidth: 0, gap: 8 }}
              >
                <EuiFlexItem grow={false}>
                  <span data-test-subj={`${dataTestSubjPrefix}DetailLogo`}>
                    <CardLogoIcon
                      src={selected.logoUrl}
                      alt=""
                      logoEuiIcon={selected.logoEuiIcon}
                      size="default"
                      iconBackground="plain"
                    />
                  </span>
                </EuiFlexItem>
                <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                  <EuiTitle size="xs">
                    <h2
                      data-test-subj={`${dataTestSubjPrefix}DetailTitle`}
                      css={css`
                        margin: 0;
                      `}
                    >
                      {selected.panelActionTitle}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            <div
              data-test-subj={`${dataTestSubjPrefix}EndpointSecretGrid`}
              css={css`
                display: flex;
                flex-direction: column;
                align-self: stretch;
                width: 100%;
                min-width: 0;
                margin-top: 12px;
                row-gap: ${euiTheme.size.s};
              `}
            >
              <div
                css={css`
                  min-width: 0;
                  min-inline-size: 0;
                  inline-size: 100%;
                `}
              >
                <ApiEndpointCodeBlockWithStyledCopy
                  copyValue={endpointUrl}
                  lineCommentLabel={endpointFieldLabel}
                  ariaLabel={endpointSnippetAriaLabel}
                  dataTestSubj={`${dataTestSubjPrefix}EndpointCode`}
                  copyDataTestSubj={`${dataTestSubjPrefix}EndpointCopy`}
                  codeBlockShortCss={codeBlockShortCss}
                />
              </div>
              <div
                css={css`
                  min-width: 0;
                  min-inline-size: 0;
                  inline-size: 100%;
                `}
              >
                <ApiEndpointSecretCodeBlockWithToolbar
                  displayedSecret={displayedSecret}
                  secretIsMissing={secretIsMissing}
                  lineCommentLabel={secretFieldLabel}
                  ariaLabel={secretSnippetAriaLabel}
                  dataTestSubj={`${dataTestSubjPrefix}SecretCode`}
                  codeBlockShortCss={codeBlockShortCss}
                  secretCodeSubduedCss={secretCodeSubduedCss}
                  showActions={showSecretRowAction}
                  isEnrollment={isEnrollment}
                  fleetUrl={fleetUrl}
                  apiKeyManageHref={apiKeyManageHref}
                  onApiKeyCreated={(result) => {
                    if (selected != null) {
                      onApiKeyCreated(result, selected.id);
                    }
                  }}
                  createApiKeyDataTestSubj={createApiKeyDataTestSubj}
                  copySecretDataTestSubj={`${dataTestSubjPrefix}SecretCopy`}
                  createEnrollmentTokenDataTestSubj={`${dataTestSubjPrefix}CreateEnrollmentToken`}
                />
              </div>
            </div>
          </EuiPanel>
        </div>
      </div>
    </EuiPanel>
  );
};
