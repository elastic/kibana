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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPanel,
  EuiSideNav,
  type EuiSideNavItemType,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CardLogoIcon } from './pages/ingest_hub/ingest_hub_components';
import { API_ENDPOINTS } from './pages/ingest_hub/ingest_hub_data';
import { Version2ApiEndpointsCreateApiKeyButton } from './version_2_api_endpoints_create_api_key_button';
import type { Version2ApiEndpointsSplitProps } from './version_2_api_endpoints_split';

/** Single-line endpoint / secret row (aligned fields, minimal vertical padding). */
const CODE_BLOCK_FIXED_HEIGHT_PX = 36;

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
  const endpointCodeLabelId = useGeneratedHtmlId({ prefix: 'obsOnboardingV3EndpointLabel' });
  const secretCodeLabelId = useGeneratedHtmlId({ prefix: 'obsOnboardingV3SecretLabel' });
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
        .euiCodeBlock__code {
          color: ${euiTheme.colors.textSubdued};
        }
      `
    : undefined;

  const showSecretRowAction =
    (isEnrollment && Boolean(fleetUrl)) ||
    selected.keyType === 'api_key' ||
    selected.keyType === 'kibana_note';

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
                display: grid;
                align-self: stretch;
                justify-items: stretch;
                width: 100%;
                min-width: 0;
                margin-top: 24px;
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
                    secretCodeSubduedCss
                      ? [codeBlockShortCss, secretCodeSubduedCss]
                      : codeBlockShortCss
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
        </div>
      </div>
    </EuiPanel>
  );
};
