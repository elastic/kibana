/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';
import { i18n } from '@kbn/i18n';
import { CardLogoIcon } from './pages/ingest_hub/ingest_hub_components';
import { API_ENDPOINTS, type ApiEndpoint } from './pages/ingest_hub/ingest_hub_data';
import { ApiEndpointCodeBlockWithStyledCopy } from './api_endpoint_code_block_with_styled_copy';
import { ApiEndpointSecretCodeBlockWithToolbar } from './api_endpoint_secret_code_block_with_toolbar';
import { Version2ApiEndpointsCreateApiKeyButton } from './version_2_api_endpoints_create_api_key_button';

/** Base min height for snippet code blocks; endpoint/secret value rows tighten to one line in child CSS. */
const API_ENDPOINT_SNIPPET_BLOCK_MIN_HEIGHT_PX = 46;

/** First card when the list is collapsed (primary OTel ingest). */
const OTLP_ENDPOINT_ID = 'endpoint-otlp';
/** Second card when collapsed (APM path). */
const APM_ENDPOINT_ID = 'endpoint-apm';

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
  onApiKeyCreated: (result: CreateAPIKeyResult, endpointId: string) => void;
  /** `data-test-subj` for the Create API key split control (without suffix). */
  createApiKeyDataTestSubj: string;
  /**
   * Version 1: credential create/manage only in the page header; cards show titles + copy only
   * for secrets (no per-card New token / Create key / manage popover on the snippet).
   */
  unifiedHeaderCredentialActions?: boolean;
}

interface ApiEndpointCardProps {
  endpoint: ApiEndpoint;
  dataTestSubjPrefix: string;
  createApiKeyDataTestSubj: string;
  secretsByEndpointId?: Record<string, string>;
  apiKeyManageHref: string;
  onApiKeyCreated: (result: CreateAPIKeyResult, endpointId: string) => void;
  unifiedHeaderCredentialActions: boolean;
}

const ApiEndpointCard: React.FC<ApiEndpointCardProps> = ({
  endpoint,
  dataTestSubjPrefix,
  createApiKeyDataTestSubj,
  secretsByEndpointId,
  apiKeyManageHref,
  onApiKeyCreated,
  unifiedHeaderCredentialActions,
}) => {
  const { euiTheme } = useEuiTheme();
  const origin = window.location.origin;
  const endpointUrl = endpoint.getEndpointUrl(origin);
  const secretValue = secretsByEndpointId?.[endpoint.id];
  const isEnrollment = endpoint.keyType === 'enrollment_token';
  const secretEmptyPlaceholder = isEnrollment ? 'No enrollment token yet' : 'No API key yet';
  const displayedSecret = secretValue ?? endpoint.sampleSecret ?? secretEmptyPlaceholder;
  const secretIsMissing = displayedSecret === secretEmptyPlaceholder;
  const fleetUrl = endpoint.openUrl?.(origin);
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
    !unifiedHeaderCredentialActions &&
    ((isEnrollment && Boolean(fleetUrl)) ||
      endpoint.keyType === 'api_key' ||
      endpoint.keyType === 'kibana_note');

  const endpointSnippetAriaLabel = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.endpointSnippetAriaLabel',
    {
      defaultMessage: 'Endpoint URL snippet',
    }
  );
  const secretSnippetAriaLabel = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.secretSnippetAriaLabel',
    {
      defaultMessage: 'API key or enrollment snippet',
    }
  );
  const apiKeysSectionTitle = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.apiKeysSectionTitle',
    {
      defaultMessage: 'API Keys',
    }
  );
  const enrollmentTokenSectionTitle = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.enrollmentTokenSectionTitle',
    {
      defaultMessage: 'Enrollment token',
    }
  );
  const secretCredentialsSectionTitle = isEnrollment
    ? enrollmentTokenSectionTitle
    : apiKeysSectionTitle;
  const endpointSectionTitleEndpoint = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.endpointSectionTitle',
    {
      defaultMessage: 'Endpoint',
    }
  );
  const endpointSectionTitleCloudId = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.cloudIdSectionTitle',
    {
      defaultMessage: 'Cloud ID',
    }
  );
  const endpointSectionTitle =
    endpoint.id === 'endpoint-cloud-id'
      ? endpointSectionTitleCloudId
      : endpointSectionTitleEndpoint;
  const newKeyButtonLabel = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.newKeyButton',
    {
      defaultMessage: 'New key',
    }
  );
  const newTokenButtonLabel = i18n.translate(
    'xpack.observability_onboarding.version2ApiEndpoints.newTokenButton',
    {
      defaultMessage: 'New token',
    }
  );
  const newCredentialButtonLabel = isEnrollment ? newTokenButtonLabel : newKeyButtonLabel;

  /** One-line preview under the endpoint name (uses `ApiEndpoint.panelActionTitle` from ingest data). */
  const cardTeaserCss = css`
    margin-block: 0;
    margin-block-start: ${euiTheme.size.xxs};
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: ${euiTheme.font.lineHeightMultiplier};
  `;

  return (
    <EuiPanel
      data-test-subj={`${dataTestSubjPrefix}Card--${endpoint.id}`}
      element="div"
      grow={false}
      hasBorder
      paddingSize="none"
      borderRadius="m"
    >
      <div
        css={css`
          width: 100%;
          box-sizing: border-box;
          padding: ${euiTheme.size.l};
        `}
      >
        <div
          data-test-subj={`${dataTestSubjPrefix}CardHeader--${endpoint.id}`}
          css={css`
            line-height: 1;
          `}
        >
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <CardLogoIcon
                src={endpoint.logoUrl}
                alt=""
                logoEuiIcon={endpoint.logoEuiIcon}
                size="default"
                iconBackground="plain"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true} css={css({ minWidth: 0 })}>
              <EuiText
                size="m"
                css={css`
                  font-weight: ${euiTheme.font.weight.bold};
                  color: ${euiTheme.colors.text};
                `}
              >
                <p style={{ margin: 0 }}>{endpoint.name}</p>
              </EuiText>
              <EuiText
                size="s"
                color="subdued"
                data-test-subj={`${dataTestSubjPrefix}CardTeaser--${endpoint.id}`}
              >
                <p css={cardTeaserCss}>{endpoint.panelActionTitle}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div
          data-test-subj={`${dataTestSubjPrefix}Block--${endpoint.id}`}
          css={css`
            margin-block-start: 24px;
          `}
        >
          <div
            data-test-subj={`${dataTestSubjPrefix}EndpointSecretGrid--${endpoint.id}`}
            css={css`
              display: flex;
              flex-direction: column;
              align-self: stretch;
              width: 100%;
              min-width: 0;
              row-gap: 24px;
            `}
          >
            <div
              data-test-subj={`${dataTestSubjPrefix}EndpointSection--${endpoint.id}`}
              css={css`
                display: flex;
                flex-direction: column;
                align-self: stretch;
                width: 100%;
                min-width: 0;
                row-gap: 8px;
              `}
            >
              <EuiTitle size="xxxs">
                <h4
                  css={css`
                    margin-block: 0;
                  `}
                >
                  {endpointSectionTitle}
                </h4>
              </EuiTitle>
              <div
                css={css`
                  min-width: 0;
                  min-inline-size: 0;
                  inline-size: 100%;
                `}
              >
                <ApiEndpointCodeBlockWithStyledCopy
                  copyValue={endpointUrl}
                  ariaLabel={endpointSnippetAriaLabel}
                  dataTestSubj={`${dataTestSubjPrefix}EndpointCode--${endpoint.id}`}
                  copyDataTestSubj={`${dataTestSubjPrefix}EndpointCopy--${endpoint.id}`}
                  codeBlockShortCss={codeBlockShortCss}
                />
              </div>
            </div>
            <div
              data-test-subj={`${dataTestSubjPrefix}SecretSection--${endpoint.id}`}
              css={css`
                display: flex;
                flex-direction: column;
                align-self: stretch;
                width: 100%;
                min-width: 0;
                row-gap: 8px;
              `}
            >
              {unifiedHeaderCredentialActions ? (
                <EuiTitle size="xxxs">
                  <h4
                    css={css`
                      margin-block: 0;
                    `}
                  >
                    {secretCredentialsSectionTitle}
                  </h4>
                </EuiTitle>
              ) : (
                <EuiFlexGroup
                  responsive={false}
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxxs">
                      <h4
                        css={css`
                          margin-block: 0;
                        `}
                      >
                        {secretCredentialsSectionTitle}
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                  {showSecretRowAction ? (
                    <EuiFlexItem grow={false}>
                      {isEnrollment && fleetUrl ? (
                        <EuiButton
                          data-test-subj={`${dataTestSubjPrefix}NewToken--${endpoint.id}`}
                          size="xs"
                          display="base"
                          fill={false}
                          iconType="plusInCircle"
                          iconSide="left"
                          href={fleetUrl}
                        >
                          {newCredentialButtonLabel}
                        </EuiButton>
                      ) : (
                        <Version2ApiEndpointsCreateApiKeyButton
                          variant="small"
                          dataTestSubj={`${createApiKeyDataTestSubj}--${endpoint.id}`}
                          manageApiKeysHref={apiKeyManageHref}
                          onCreated={(result) => onApiKeyCreated(result, endpoint.id)}
                        />
                      )}
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              )}
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
                  ariaLabel={secretSnippetAriaLabel}
                  dataTestSubj={`${dataTestSubjPrefix}SecretCode--${endpoint.id}`}
                  codeBlockShortCss={codeBlockShortCss}
                  secretCodeSubduedCss={secretCodeSubduedCss}
                  showActions={false}
                  isEnrollment={isEnrollment}
                  fleetUrl={fleetUrl}
                  apiKeyManageHref={apiKeyManageHref}
                  onApiKeyCreated={(result) => onApiKeyCreated(result, endpoint.id)}
                  createApiKeyDataTestSubj={`${createApiKeyDataTestSubj}--${endpoint.id}`}
                  copySecretDataTestSubj={`${dataTestSubjPrefix}SecretCopy--${endpoint.id}`}
                  createEnrollmentTokenDataTestSubj={`${dataTestSubjPrefix}CreateEnrollmentToken--${endpoint.id}`}
                  showManageMenu={!unifiedHeaderCredentialActions}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </EuiPanel>
  );
};

export const Version2ApiEndpointsSplit: React.FC<Version2ApiEndpointsSplitProps> = ({
  searchQuery,
  selectedEndpointId,
  onSelectEndpoint,
  dataTestSubjPrefix = 'obsOnboardingV2ApiEndpoints',
  secretsByEndpointId,
  apiKeyManageHref,
  onApiKeyCreated,
  createApiKeyDataTestSubj,
  unifiedHeaderCredentialActions = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [showMoreEndpoints, setShowMoreEndpoints] = useState(false);
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

  const defaultVisibleEndpoints = useMemo(() => {
    if (filteredEndpoints.length === 0) {
      return [] as ApiEndpoint[];
    }
    const endpointMap = new Map(filteredEndpoints.map((endpoint) => [endpoint.id, endpoint]));
    const pinned = [OTLP_ENDPOINT_ID, APM_ENDPOINT_ID]
      .map((id) => endpointMap.get(id))
      .filter((endpoint): endpoint is ApiEndpoint => Boolean(endpoint));
    if (pinned.length > 0) {
      return pinned;
    }
    return [filteredEndpoints[0]];
  }, [filteredEndpoints]);

  const defaultCollapsedEndpointId = defaultVisibleEndpoints[0]?.id ?? null;

  const otherEndpoints = useMemo(
    () =>
      filteredEndpoints.filter(
        (endpoint) =>
          !defaultVisibleEndpoints.some((defaultEndpoint) => defaultEndpoint.id === endpoint.id)
      ),
    [filteredEndpoints, defaultVisibleEndpoints]
  );

  useEffect(() => {
    if (filteredEndpoints.length <= 1) {
      setShowMoreEndpoints(false);
    }
  }, [filteredEndpoints.length]);

  useEffect(() => {
    if (showMoreEndpoints || defaultCollapsedEndpointId == null) {
      return;
    }
    if (selectedEndpointId !== defaultCollapsedEndpointId) {
      onSelectEndpoint(defaultCollapsedEndpointId);
    }
  }, [showMoreEndpoints, defaultCollapsedEndpointId, selectedEndpointId, onSelectEndpoint]);

  if (filteredEndpoints.length === 0 || defaultVisibleEndpoints.length === 0) {
    return <EuiText color="subdued">No API endpoints match your search.</EuiText>;
  }

  const showEndpointList = otherEndpoints.length > 0;

  const subduedShellCss = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    padding: 24px;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  `;

  const toggleShowMoreEndpoints = () => {
    if (showMoreEndpoints && defaultCollapsedEndpointId != null) {
      onSelectEndpoint(defaultCollapsedEndpointId);
    }
    setShowMoreEndpoints((prev) => !prev);
  };

  const cardProps = {
    dataTestSubjPrefix,
    createApiKeyDataTestSubj,
    secretsByEndpointId,
    apiKeyManageHref,
    onApiKeyCreated,
    unifiedHeaderCredentialActions,
  };

  return (
    <div
      data-test-subj={`${dataTestSubjPrefix}Split ${dataTestSubjPrefix}Detail`}
      css={css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        min-width: 0;
        text-align: start;
      `}
    >
      <div data-test-subj={`${dataTestSubjPrefix}EndpointsShell`} css={subduedShellCss}>
        <div
          data-test-subj={`${dataTestSubjPrefix}EndpointsGrid`}
          css={css`
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: ${euiTheme.size.m};
            @media (max-width: ${euiTheme.breakpoint.m}px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          {defaultVisibleEndpoints.map((endpoint) => (
            <div key={endpoint.id}>
              <ApiEndpointCard endpoint={endpoint} {...cardProps} />
            </div>
          ))}
          {showMoreEndpoints
            ? otherEndpoints.map((endpoint) => (
                <div key={endpoint.id}>
                  <ApiEndpointCard endpoint={endpoint} {...cardProps} />
                </div>
              ))
            : null}
        </div>
      </div>

      {showEndpointList ? (
        <div
          css={css`
            position: relative;
            text-align: center;
            margin-top: ${euiTheme.size.m};
          `}
        >
          <EuiHorizontalRule
            margin="none"
            css={css`
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
            `}
          />
          <span
            css={css`
              position: relative;
              background-color: ${euiTheme.colors.backgroundBasePlain};
              padding: 0 8px;
            `}
          >
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubjPrefix}ShowMoreToggle`}
              size="s"
              iconType={showMoreEndpoints ? 'arrowUp' : 'arrowDown'}
              iconSide="right"
              onClick={toggleShowMoreEndpoints}
            >
              {showMoreEndpoints
                ? i18n.translate(
                    'xpack.observabilityOnboarding.version2ApiEndpoints.showLessEndpoints',
                    { defaultMessage: 'Show less' }
                  )
                : i18n.translate(
                    'xpack.observabilityOnboarding.version2ApiEndpoints.showMoreEndpoints',
                    { defaultMessage: 'Show more' }
                  )}
            </EuiButtonEmpty>
          </span>
        </div>
      ) : null}
    </div>
  );
};
