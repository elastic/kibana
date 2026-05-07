/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';
import { i18n } from '@kbn/i18n';
import { CardLogoIcon } from './pages/ingest_hub/ingest_hub_components';
import { API_ENDPOINTS, type ApiEndpoint } from './pages/ingest_hub/ingest_hub_data';
import { ApiEndpointCodeBlockWithStyledCopy } from './api_endpoint_code_block_with_styled_copy';
import { ApiEndpointSecretCodeBlockWithToolbar } from './api_endpoint_secret_code_block_with_toolbar';

/** Compact min height for `// Label` + value (two lines) inside each snippet block. */
const API_ENDPOINT_SNIPPET_BLOCK_MIN_HEIGHT_PX = 46;

/** Default endpoint shown when the list is collapsed (matches primary REST use case). */
const ELASTICSEARCH_ENDPOINT_ID = 'endpoint-elasticsearch';
/** Also pin OTLP in collapsed view (primary ingest path). */
const OTLP_ENDPOINT_ID = 'endpoint-otlp';

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
}

interface ApiEndpointCardProps {
  endpoint: ApiEndpoint;
  dataTestSubjPrefix: string;
  createApiKeyDataTestSubj: string;
  secretsByEndpointId?: Record<string, string>;
  apiKeyManageHref: string;
  onApiKeyCreated: (result: CreateAPIKeyResult, endpointId: string) => void;
}

const ApiEndpointCard: React.FC<ApiEndpointCardProps> = ({
  endpoint,
  dataTestSubjPrefix,
  createApiKeyDataTestSubj,
  secretsByEndpointId,
  apiKeyManageHref,
  onApiKeyCreated,
}) => {
  const { euiTheme } = useEuiTheme();
  const origin = window.location.origin;
  const endpointUrl = endpoint.getEndpointUrl(origin);
  const secretValue = secretsByEndpointId?.[endpoint.id];
  const isEnrollment = endpoint.keyType === 'enrollment_token';
  const secretEmptyPlaceholder = isEnrollment ? 'No enrollment token yet' : 'No API key yet';
  const displayedSecret = secretValue ?? endpoint.sampleSecret ?? secretEmptyPlaceholder;
  const secretIsMissing = displayedSecret === secretEmptyPlaceholder;
  const endpointFieldLabel = endpoint.id === 'endpoint-cloud-id' ? 'Cloud ID' : 'Endpoint';
  const secretFieldLabel = isEnrollment ? 'Enrollment token' : 'API key';
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
    (isEnrollment && Boolean(fleetUrl)) ||
    endpoint.keyType === 'api_key' ||
    endpoint.keyType === 'kibana_note';

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
            margin-block-start: 12px;
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
                dataTestSubj={`${dataTestSubjPrefix}EndpointCode--${endpoint.id}`}
                copyDataTestSubj={`${dataTestSubjPrefix}EndpointCopy--${endpoint.id}`}
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
                dataTestSubj={`${dataTestSubjPrefix}SecretCode--${endpoint.id}`}
                codeBlockShortCss={codeBlockShortCss}
                secretCodeSubduedCss={secretCodeSubduedCss}
                showActions={showSecretRowAction}
                isEnrollment={isEnrollment}
                fleetUrl={fleetUrl}
                apiKeyManageHref={apiKeyManageHref}
                onApiKeyCreated={(result) => onApiKeyCreated(result, endpoint.id)}
                createApiKeyDataTestSubj={`${createApiKeyDataTestSubj}--${endpoint.id}`}
                copySecretDataTestSubj={`${dataTestSubjPrefix}SecretCopy--${endpoint.id}`}
                createEnrollmentTokenDataTestSubj={`${dataTestSubjPrefix}CreateEnrollmentToken--${endpoint.id}`}
              />
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
    const pinned = [ELASTICSEARCH_ENDPOINT_ID, OTLP_ENDPOINT_ID]
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
