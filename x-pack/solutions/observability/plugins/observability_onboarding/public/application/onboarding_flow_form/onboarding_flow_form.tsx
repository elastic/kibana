/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { FunctionComponent } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCard,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingElastic,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useSearchParams, useNavigate } from 'react-router-dom-v5-compat';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { PackageListSearchForm } from '../package_list_search_form/package_list_search_form';
import { useCustomCards } from './use_custom_cards';
import type { ObservabilityOnboardingAppServices } from '../..';
import {
  SECTIONS,
  POPULAR_INTEGRATION_TILES,
  API_ENDPOINTS,
  ELASTIC_LOGOS,
} from '../pages/ingest_hub/ingest_hub_data';
import { CardLogoIcon, IntegrationCard } from '../pages/ingest_hub/ingest_hub_components';
import { useActiveVersion } from '../version_switcher_widget';
import { Version2ApiEndpointsSplit } from '../version_2_api_endpoints_split';
import { Version3ApiEndpointsSplit } from '../version_3_api_endpoints_split';

const allSections = [...SECTIONS];

export const OnboardingFlowForm: FunctionComponent = () => {
  const {
    services: {
      context: { isCloud },
      application,
      docLinks,
      chrome,
      http,
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const [activeVersion] = useActiveVersion();

  const supportUrl = useObservable(chrome.getHelpSupportUrl$());

  const { onPageReady } = usePerformanceContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integrationSearch, setIntegrationSearch] = useState(searchParams.get('search') ?? '');
  const { euiTheme } = useEuiTheme();
  const navigate = useNavigate();

  const createCollectionCardHandler = useCallback(
    (query: string) => () => {
      setIntegrationSearch(query);
    },
    []
  );

  useEffect(() => {
    const searchParam = searchParams.get('search') ?? '';
    if (integrationSearch === searchParam) return;
    const entries: Record<string, string> = Object.fromEntries(searchParams.entries());
    if (integrationSearch) {
      entries.search = integrationSearch;
    } else {
      delete entries.search;
    }
    setSearchParams(entries, { replace: true });
  }, [integrationSearch, searchParams, setSearchParams]);

  useEffect(() => {
    onPageReady({
      meta: { description: '[ttfmp_onboarding] The UI with onboarding categories is rendered' },
    });
  }, [onPageReady]);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showMoreApi, setShowMoreApi] = useState(false);
  const [createdKeys, setCreatedKeys] = useState<Record<string, string>>({});
  const [createKeyFlyout, setCreateKeyFlyout] = useState<{
    endpointId: string;
    keyName: string;
  } | null>(null);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [flyoutTab, setFlyoutTab] = useState<'details' | 'api-key'>('details');
  const [version2ApiEndpointId, setVersion2ApiEndpointId] = useState(
    API_ENDPOINTS[0]?.id ?? 'endpoint-elasticsearch'
  );
  /** Package search + results portal target (Version 2: Integrations section below API). */
  const [version2IntegrationsPackageHost, setVersion2IntegrationsPackageHost] =
    useState<HTMLDivElement | null>(null);
  const [version3ApiEndpointId, setVersion3ApiEndpointId] = useState(
    API_ENDPOINTS[0]?.id ?? 'endpoint-elasticsearch'
  );
  const [version3IntegrationsPackageHost, setVersion3IntegrationsPackageHost] =
    useState<HTMLDivElement | null>(null);
  const [version3CreatedKeys, setVersion3CreatedKeys] = useState<Record<string, string>>({});

  const customCards = useCustomCards(createCollectionCardHandler);

  const isLandingV2OrV3 = activeVersion === 'version2' || activeVersion === 'version3';

  useEffect(() => {
    if (activeVersion === 'version2' || activeVersion === 'version3') {
      setOpenAccordionId(null);
    }
  }, [activeVersion]);

  useEffect(() => {
    if (activeVersion !== 'version2') {
      return;
    }
    if (!API_ENDPOINTS.some((e) => e.id === version2ApiEndpointId)) {
      setVersion2ApiEndpointId(API_ENDPOINTS[0]!.id);
    }
  }, [activeVersion, version2ApiEndpointId]);

  useEffect(() => {
    if (activeVersion !== 'version3') {
      return;
    }
    if (!API_ENDPOINTS.some((e) => e.id === version3ApiEndpointId)) {
      setVersion3ApiEndpointId(API_ENDPOINTS[0]!.id);
    }
  }, [activeVersion, version3ApiEndpointId]);

  useEffect(() => {
    if (activeVersion !== 'version2' && activeVersion !== 'version3') {
      setVersion2IntegrationsPackageHost(null);
      setVersion3IntegrationsPackageHost(null);
    }
  }, [activeVersion]);
  const searchExcludePackageIdList = isCloud ? ['epr:awsfirehose'] : [];

  return (
    <>
      {/* Always mounted so onLoadingChange fires once packages load */}
      <PackageListSearchForm
        searchQuery={integrationSearch}
        setSearchQuery={setIntegrationSearch}
        flowCategory={null}
        customCards={customCards.filter((card) => !card.isCollectionCard)}
        excludePackageIdList={searchExcludePackageIdList}
        onLoadingChange={(loading) => setIsPageLoading(loading)}
        portaledUiContainerEl={
          activeVersion === 'version2'
            ? version2IntegrationsPackageHost
            : activeVersion === 'version3'
            ? version3IntegrationsPackageHost
            : undefined
        }
        hideSearchBar
      />

      {isPageLoading && (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
          <EuiLoadingElastic size="xl" />
        </EuiFlexGroup>
      )}

      {/* Categorized sections — hidden while loading; Version 2/3 stays visible while searching */}
      {!isPageLoading && (isLandingV2OrV3 || !integrationSearch) && (
        <>
          {/* API ingestion section */}
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            alignItems="stretch"
            /* EuiFlexGroup replaces `css`; alignSelf stretch so API block uses full content width */
            style={{
              gap: 24,
              flexGrow: 0,
              alignSelf: 'stretch',
              width: '100%',
              minWidth: 0,
            }}
          >
            <EuiFlexGroup
              alignItems="flexStart"
              responsive={true}
              gutterSize="m"
              style={{ flexGrow: 0, width: '100%', minWidth: 0 }}
            >
              <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                <EuiTitle size="s">
                  <h3>API endpoints</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>
                    Direct access to your deployment&apos;s endpoints. Create an API key to
                    authenticate.{' '}
                    <EuiLink
                      data-test-subj="obsOnboardingLandingV2ApiEndpointsDocumentation"
                      href="https://www.elastic.co/docs/deploy-manage/api-keys/elasticsearch-api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      external
                    >
                      {i18n.translate(
                        'xpack.observabilityOnboarding.version2ApiEndpoints.elasticsearchApiKeysLearnMore',
                        { defaultMessage: 'Learn more' }
                      )}
                    </EuiLink>
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            {isLandingV2OrV3 ? (
              activeVersion === 'version3' ? (
                <Version3ApiEndpointsSplit
                  searchQuery=""
                  selectedEndpointId={version3ApiEndpointId}
                  onSelectEndpoint={setVersion3ApiEndpointId}
                  dataTestSubjPrefix="obsOnboardingLandingV3ApiEndpoint"
                  secretsByEndpointId={version3CreatedKeys}
                  apiKeyManageHref={http.basePath.prepend('/app/management/security/api_keys')}
                  createApiKeyDataTestSubj="obsOnboardingLandingV3CreateApiKey"
                  onApiKeyCreated={(result) => {
                    const endpoint = API_ENDPOINTS.find((e) => e.id === version3ApiEndpointId);
                    if (
                      endpoint &&
                      (endpoint.keyType === 'api_key' || endpoint.keyType === 'kibana_note')
                    ) {
                      setVersion3CreatedKeys((prev) => ({
                        ...prev,
                        [version3ApiEndpointId]: result.encoded,
                      }));
                    }
                  }}
                />
              ) : (
                <Version2ApiEndpointsSplit
                  searchQuery=""
                  selectedEndpointId={version2ApiEndpointId}
                  onSelectEndpoint={setVersion2ApiEndpointId}
                  dataTestSubjPrefix="obsOnboardingLandingV2ApiEndpoint"
                  secretsByEndpointId={createdKeys}
                  apiKeyManageHref={http.basePath.prepend('/app/management/security/api_keys')}
                  createApiKeyDataTestSubj="obsOnboardingLandingV2CreateApiKey"
                  onApiKeyCreated={(result) => {
                    const endpoint = API_ENDPOINTS.find((e) => e.id === version2ApiEndpointId);
                    if (
                      endpoint &&
                      (endpoint.keyType === 'api_key' || endpoint.keyType === 'kibana_note')
                    ) {
                      setCreatedKeys((prev) => ({
                        ...prev,
                        [version2ApiEndpointId]: result.encoded,
                      }));
                    }
                  }}
                />
              )
            ) : (
              <>
                <div
                  css={css`
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                    border-radius: ${euiTheme.border.radius.medium};
                    padding: 24px;
                  `}
                >
                  <div
                    css={css`
                      display: grid;
                      grid-template-columns: repeat(2, 1fr);
                      gap: 12px;
                    `}
                  >
                    {API_ENDPOINTS.slice(0, 2).map((endpoint) => {
                      return (
                        <EuiCard
                          key={endpoint.id}
                          layout="horizontal"
                          hasBorder
                          paddingSize="none"
                          icon={
                            <div style={{ position: 'relative', display: 'inline-flex' }}>
                              <CardLogoIcon
                                src={endpoint.logoUrl}
                                alt={endpoint.name}
                                logoEuiIcon={endpoint.logoEuiIcon}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: -5,
                                  right: -5,
                                  width: 20,
                                  height: 20,
                                  borderRadius: 5,
                                  backgroundColor: euiTheme.colors.backgroundBasePlain,
                                  border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <EuiIcon type="code" size="m" color={euiTheme.colors.textSubdued} />
                              </div>
                            </div>
                          }
                          title={endpoint.name}
                          titleElement="h4"
                          titleSize="xs"
                          description={endpoint.description}
                          onClick={() => {
                            setOpenAccordionId(endpoint.id);
                            setFlyoutTab('details');
                          }}
                          css={css`
                            border-radius: 6px;
                            padding: 16px;
                            box-shadow: none;
                            cursor: pointer;
                            .euiCard__top {
                              margin-inline-end: 12px;
                              flex-shrink: 0;
                              align-self: flex-start;
                            }
                            .euiCard__content,
                            .euiCard__children {
                              margin-bottom: 0;
                              padding-bottom: 0;
                            }
                            & [class*='euiCard__description'] {
                              margin-block-start: 4px !important;
                            }
                          `}
                        />
                      );
                    })}
                    {showMoreApi &&
                      API_ENDPOINTS.slice(2).map((endpoint) => {
                        return (
                          <EuiCard
                            key={endpoint.id}
                            layout="horizontal"
                            hasBorder
                            paddingSize="none"
                            icon={
                              <div style={{ position: 'relative', display: 'inline-flex' }}>
                                <CardLogoIcon
                                  src={endpoint.logoUrl}
                                  alt={endpoint.name}
                                  logoEuiIcon={endpoint.logoEuiIcon}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: -5,
                                    right: -5,
                                    width: 20,
                                    height: 20,
                                    borderRadius: 5,
                                    backgroundColor: euiTheme.colors.backgroundBasePlain,
                                    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <EuiIcon
                                    type="code"
                                    size="m"
                                    color={euiTheme.colors.textSubdued}
                                  />
                                </div>
                              </div>
                            }
                            title={endpoint.name}
                            titleElement="h4"
                            titleSize="xs"
                            description={endpoint.description}
                            onClick={() => {
                              setOpenAccordionId(endpoint.id);
                              setFlyoutTab('details');
                            }}
                            css={css`
                              border-radius: 6px;
                              padding: 16px;
                              box-shadow: none;
                              cursor: pointer;
                              .euiCard__top {
                                margin-inline-end: 12px;
                                flex-shrink: 0;
                                align-self: flex-start;
                              }
                              .euiCard__content,
                              .euiCard__children {
                                margin-bottom: 0;
                                padding-bottom: 0;
                              }
                              & [class*='euiCard__description'] {
                                margin-block-start: 4px !important;
                              }
                            `}
                          />
                        );
                      })}
                  </div>
                </div>
                <div
                  css={css`
                    position: relative;
                    text-align: center;
                    margin-top: 12px;
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
                      data-test-subj="observabilityOnboardingOnboardingFlowFormButton"
                      size="s"
                      iconType={showMoreApi ? 'arrowUp' : 'arrowDown'}
                      iconSide="right"
                      onClick={() => setShowMoreApi((prev) => !prev)}
                    >
                      {showMoreApi ? 'Show less' : 'Show more'}
                    </EuiButtonEmpty>
                  </span>
                </div>
              </>
            )}
          </EuiFlexGroup>

          {/* API endpoint detail flyout */}
          {openAccordionId &&
            !isLandingV2OrV3 &&
            (() => {
              const endpoint = API_ENDPOINTS.find((e) => e.id === openAccordionId);
              if (!endpoint) return null;
              const existingKey = createdKeys[endpoint.id];
              const isEnrollment = endpoint.keyType === 'enrollment_token';
              const isKibanaNoteType = endpoint.keyType === 'kibana_note';
              const endpointUrl = endpoint.getEndpointUrl(window.location.origin);
              const flyoutEndpointId = isKibanaNoteType ? 'endpoint-elasticsearch' : endpoint.id;
              const codeBlockCss = css`
                height: 32px;
                overflow: hidden;
                .euiCodeBlock__pre,
                .euiCodeBlock__code {
                  height: 32px;
                  padding: 0 8px;
                  line-height: 32px;
                  overflow: hidden;
                }
                .euiCodeBlock__controls {
                  top: 50%;
                  transform: translateY(-50%);
                  height: auto;
                  display: flex;
                  align-items: center;
                }
              `;
              return (
                <EuiFlyout ownFocus onClose={() => setOpenAccordionId(null)} size="m">
                  <EuiFlyoutHeader>
                    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <CardLogoIcon
                          src={endpoint.logoUrl}
                          alt={endpoint.name}
                          logoEuiIcon={endpoint.logoEuiIcon}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiTitle size="s">
                          <h2>{endpoint.name}</h2>
                        </EuiTitle>
                        <EuiText size="s" color="subdued">
                          <p>{endpoint.description}</p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="m" />
                    <EuiTabs>
                      <EuiTab
                        isSelected={flyoutTab === 'details'}
                        onClick={() => setFlyoutTab('details')}
                      >
                        Details
                      </EuiTab>
                      <EuiTab
                        isSelected={flyoutTab === 'api-key'}
                        onClick={() => setFlyoutTab('api-key')}
                      >
                        {isEnrollment ? 'Enrollment token' : 'API Key'}
                      </EuiTab>
                    </EuiTabs>
                  </EuiFlyoutHeader>

                  <EuiFlyoutBody>
                    {flyoutTab === 'details' && (
                      <>
                        <EuiText size="s">
                          <p>{endpoint.details}</p>
                        </EuiText>
                        <EuiSpacer size="l" />
                        <EuiFormRow label="Endpoint" fullWidth>
                          <EuiCodeBlock
                            language="text"
                            fontSize="s"
                            paddingSize="none"
                            isCopyable
                            whiteSpace="nowrap"
                            data-test-subj={`observabilityOnboardingFlyoutCodeBlock--${openAccordionId}--details`}
                            css={codeBlockCss}
                          >
                            {endpointUrl}
                          </EuiCodeBlock>
                        </EuiFormRow>
                        <EuiSpacer size="l" />
                        <EuiLink
                          data-test-subj="observabilityOnboardingOnboardingFlowFormViewDocumentationLink"
                          href={endpoint.docsUrl}
                          target="_blank"
                          external
                        >
                          View documentation
                        </EuiLink>
                      </>
                    )}

                    {flyoutTab === 'api-key' && (
                      <>
                        <EuiText size="s" color="subdued">
                          <p>{endpoint.keyTypeDescription}</p>
                        </EuiText>
                        <EuiSpacer size="l" />
                        <EuiFormRow label={isEnrollment ? 'Enrollment token' : 'API Key'} fullWidth>
                          <EuiCodeBlock
                            language="text"
                            fontSize="s"
                            paddingSize="none"
                            isCopyable={!!existingKey}
                            whiteSpace="nowrap"
                            data-test-subj={`observabilityOnboardingFlyoutCodeBlock--${openAccordionId}--apiKey`}
                            css={css`
                              ${codeBlockCss}
                              .euiCodeBlock__pre,
                            .euiCodeBlock__code {
                                color: ${existingKey ? 'inherit' : euiTheme.colors.textSubdued};
                              }
                            `}
                          >
                            {existingKey ?? 'No key created yet'}
                          </EuiCodeBlock>
                        </EuiFormRow>
                        <EuiSpacer size="m" />
                        {existingKey ? (
                          <EuiFlexGroup gutterSize="s" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiButton
                                data-test-subj="observabilityOnboardingOnboardingFlowFormRegenerateButton"
                                size="s"
                                iconType="refresh"
                                onClick={() =>
                                  setCreateKeyFlyout({ endpointId: flyoutEndpointId, keyName: '' })
                                }
                              >
                                Regenerate
                              </EuiButton>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        ) : (
                          <EuiButton
                            data-test-subj="observabilityOnboardingOnboardingFlowFormButton"
                            size="s"
                            fill
                            onClick={() =>
                              setCreateKeyFlyout({ endpointId: flyoutEndpointId, keyName: '' })
                            }
                          >
                            {isEnrollment ? 'Create enrollment token' : 'Create API key'}
                          </EuiButton>
                        )}
                      </>
                    )}
                  </EuiFlyoutBody>
                </EuiFlyout>
              );
            })()}

          {/* Integrations section */}
          <div style={{ height: 40 }} />
          <EuiTitle size="s">
            <h3>Integrations</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              Pre-built integrations for your infrastructure and services. Includes dashboards,
              alerts, and more.
            </p>
          </EuiText>
          <div style={{ height: 24 }} />
          <div
            css={css`
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              border-radius: ${euiTheme.border.radius.medium};
              padding: 24px;
              min-width: 0;
              ${activeVersion === 'version2' ? 'margin-bottom: 24px;' : ''}
            `}
          >
            {isLandingV2OrV3 ? (
              <div
                ref={
                  activeVersion === 'version3'
                    ? setVersion3IntegrationsPackageHost
                    : setVersion2IntegrationsPackageHost
                }
                style={{
                  /* Only separate portaled package hits from the grid when search is active. */
                  marginBottom: integrationSearch.trim() ? 40 : 0,
                }}
              />
            ) : null}
            {(!isLandingV2OrV3 || !integrationSearch) && (
              <>
                {allSections.map((section, index) => (
                  <div key={section.title}>
                    <div style={{ height: index === 0 ? 0 : 40 }} />
                    <EuiText
                      size="s"
                      css={css`
                        font-weight: ${euiTheme.font.weight.bold};
                        color: ${euiTheme.colors.text};
                        margin-bottom: 8px;
                      `}
                    >
                      <p>{section.title}</p>
                    </EuiText>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
                    >
                      {section.tiles.map((tile) => (
                        <IntegrationCard
                          key={tile.id}
                          name={tile.name}
                          description={tile.description}
                          logoDomain={tile.logoDomain}
                          logoUrl={tile.logoUrl}
                          layout="horizontal"
                          onClick={() => navigate(`/add-data/${tile.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Popular integrations row */}
                <div style={{ height: 40 }} />
                <EuiText
                  size="s"
                  css={css`
                    font-weight: ${euiTheme.font.weight.bold};
                    color: ${euiTheme.colors.text};
                    margin-bottom: 8px;
                  `}
                >
                  <p>More integrations</p>
                </EuiText>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) minmax(0, 2fr)',
                    gap: 12,
                    alignItems: 'start',
                  }}
                >
                  {POPULAR_INTEGRATION_TILES.map((tile) => (
                    <EuiCard
                      key={tile.id}
                      title={tile.name}
                      titleElement="h4"
                      titleSize="xs"
                      description=""
                      icon={<CardLogoIcon src={tile.logoUrl ?? ''} alt={`${tile.name} logo`} />}
                      layout="vertical"
                      hasBorder
                      paddingSize="none"
                      onClick={() => navigate(`/add-data/${tile.id.replace('popular-', '')}`)}
                      css={css`
                        border-radius: 6px;
                        box-shadow: ${euiTheme.shadows.s};
                        padding: 16px;
                        cursor: pointer;
                        text-align: center;
                        transition: box-shadow 150ms ease-in;
                        &:hover,
                        &:focus {
                          box-shadow: ${euiTheme.shadows.m};
                        }
                        .euiCard__top {
                          display: flex;
                          justify-content: center;
                          margin-bottom: 12px;
                        }
                        .euiCard__icon {
                          margin-block-start: 0;
                        }
                        .euiCard__title {
                          font-family: ${euiTheme.font.family};
                          font-weight: ${euiTheme.font.weight.bold};
                          color: ${euiTheme.colors.text};
                        }
                        .euiCard__description,
                        .euiCard__children {
                          display: none;
                        }
                        .euiCard__content {
                          margin-bottom: 0;
                          padding-bottom: 0;
                        }
                      `}
                    />
                  ))}
                  <EuiCard
                    title="Browse all"
                    titleElement="h4"
                    titleSize="xs"
                    description=""
                    icon={
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 40,
                          overflow: 'hidden',
                        }}
                      >
                        {[
                          {
                            id: 'nginx',
                            name: 'Nginx',
                            url: `${ELASTIC_LOGOS}/nginx/img/logo_nginx.svg`,
                          },
                          {
                            id: 'rabbitmq',
                            name: 'RabbitMQ',
                            url: `${ELASTIC_LOGOS}/rabbitmq/img/logo_rabbitmq.svg`,
                          },
                          {
                            id: 'apache',
                            name: 'Apache',
                            url: `${ELASTIC_LOGOS}/apache/img/logo_apache.svg`,
                          },
                          {
                            id: 'couchbase',
                            name: 'Couchbase',
                            url: `${ELASTIC_LOGOS}/couchbase/img/couchbase-logo.svg`,
                          },
                          {
                            id: 'logstash',
                            name: 'Logstash',
                            url: `${ELASTIC_LOGOS}/logstash/img/logo_logstash.svg`,
                          },
                          {
                            id: 'redis',
                            name: 'Redis',
                            url: `${ELASTIC_LOGOS}/redis/img/logo_redis.svg`,
                          },
                          {
                            id: 'mysql',
                            name: 'MySQL',
                            url: `${ELASTIC_LOGOS}/mysql/img/logo_mysql.svg`,
                          },
                        ].map((logo, i, arr) => (
                          <div
                            key={logo.id}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                              border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: i === 0 ? 0 : -10,
                              zIndex: arr.length - i,
                              position: 'relative',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={logo.url}
                              alt={logo.name}
                              style={{ width: 24, height: 24, objectFit: 'contain' }}
                            />
                          </div>
                        ))}
                      </div>
                    }
                    layout="vertical"
                    hasBorder
                    paddingSize="none"
                    onClick={() => application.navigateToApp('integrations', { path: '/browse' })}
                    css={css`
                      border-radius: 6px;
                      box-shadow: ${euiTheme.shadows.s};
                      padding: 16px;
                      cursor: pointer;
                      text-align: center;
                      transition: box-shadow 150ms ease-in;
                      &:hover,
                      &:focus {
                        box-shadow: ${euiTheme.shadows.m};
                      }
                      .euiCard__top {
                        display: flex;
                        justify-content: center;
                        margin-bottom: 12px;
                      }
                      .euiCard__icon {
                        margin-block-start: 0;
                      }
                      .euiCard__title {
                        font-family: ${euiTheme.font.family};
                        font-weight: ${euiTheme.font.weight.bold};
                        color: ${euiTheme.colors.text};
                      }
                      .euiCard__description,
                      .euiCard__children {
                        display: none;
                      }
                      .euiCard__content {
                        margin-bottom: 0;
                        padding-bottom: 0;
                      }
                    `}
                  />
                </div>
              </>
            )}
          </div>
          {/* end integrations content shell */}
        </>
      )}

      {createKeyFlyout &&
        (() => {
          const endpoint = API_ENDPOINTS.find((e) => e.id === createKeyFlyout.endpointId);
          if (!endpoint) return null;
          const isEnrollment = endpoint.keyType === 'enrollment_token';
          const keyLabel = isEnrollment ? 'enrollment token' : 'API key';
          const keyLabelCap = isEnrollment ? 'Enrollment token' : 'API Key';

          return (
            <EuiFlyout
              ownFocus
              onClose={() => setCreateKeyFlyout(null)}
              size="s"
              aria-labelledby="createKeyFlyoutTitle"
            >
              <EuiFlyoutHeader hasBorder>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    {endpoint.logoEuiIcon ? (
                      <EuiIcon type={endpoint.logoEuiIcon} size="l" title={endpoint.name} />
                    ) : (
                      <img
                        src={endpoint.logoUrl}
                        alt={endpoint.name}
                        style={{ width: 20, height: 20, objectFit: 'contain' }}
                      />
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <h2 id="createKeyFlyoutTitle">
                        Create {keyLabel} for {endpoint.name}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                {endpoint.keyRole && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="s" color="subdued">
                      <p>
                        This {keyLabel} will have <strong>{endpoint.keyRole}</strong> permissions.{' '}
                        <EuiLink
                          data-test-subj="observabilityOnboardingOnboardingFlowFormLearnMoreLink"
                          href={docLinks.links.elasticsearch.apiKeys}
                          target="_blank"
                        >
                          Learn more
                        </EuiLink>
                      </p>
                    </EuiText>
                  </>
                )}
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                <EuiFormRow
                  label={`${keyLabelCap} name`}
                  helpText={`A descriptive name helps identify what this ${keyLabel} is used for.`}
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj="observabilityOnboardingOnboardingFlowFormFieldText"
                    value={createKeyFlyout.keyName}
                    onChange={(e) =>
                      setCreateKeyFlyout((prev) =>
                        prev ? { ...prev, keyName: e.target.value } : null
                      )
                    }
                    fullWidth
                    placeholder={`e.g. ${endpoint.name.toLowerCase().replace(/[\s–-]+/g, '-')}-key`}
                    autoFocus
                  />
                </EuiFormRow>
                {endpoint.keyBehavior && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiText size="s" color="subdued">
                      <p>
                        {endpoint.keyBehavior === 'reused' &&
                          'This key is typically reused across sessions.'}
                        {endpoint.keyBehavior === 'always_recreated' &&
                          'A new key should be created each time to maintain security.'}
                        {endpoint.keyBehavior === 'legacy' &&
                          'Legacy usage — only required for Beats or Logstash configurations.'}
                      </p>
                    </EuiText>
                  </>
                )}
              </EuiFlyoutBody>
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="observabilityOnboardingOnboardingFlowFormButton"
                      iconType="key"
                      href={`${window.location.origin}/app/management/security/api_keys`}
                      target="_blank"
                    >
                      Manage {isEnrollment ? 'tokens' : 'API keys'}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="observabilityOnboardingOnboardingFlowFormButton"
                      fill
                      isDisabled={!createKeyFlyout.keyName}
                      onClick={() => {
                        const mockKey = `${createKeyFlyout.keyName}:${Date.now().toString(
                          36
                        )}abcdef1234567890`;
                        setCreatedKeys((prev) => ({
                          ...prev,
                          [createKeyFlyout!.endpointId]: mockKey,
                        }));
                        setCreateKeyFlyout(null);
                      }}
                    >
                      Create {keyLabelCap}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            </EuiFlyout>
          );
        })()}

      {/* Not ready section — shown once loaded */}
      {!isPageLoading && (
        <div
          css={css`
            padding-block-end: 80px;
          `}
        >
          <div style={{ height: 40 }} />
          <EuiTitle size="s">
            <h3>Not ready to add data?</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              Explore resources to learn more, get help, or try Elastic before connecting your data.
            </p>
          </EuiText>
          <div style={{ height: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              {
                id: 'demo',
                title: 'Demo environment',
                description: 'See Elastic in action with a live demo.',
                icon: 'play',
                href: 'https://www.elastic.co/demo',
              },
              {
                id: 'forum',
                title: 'Explore forum',
                description: 'Get help and connect with the Elastic community.',
                icon: 'discuss',
                href: 'https://discuss.elastic.co/',
              },
              {
                id: 'docs',
                title: 'Browse documentation',
                description: 'In-depth guides for all Observability features.',
                icon: 'documentation',
                href: docLinks.links.observability.guide,
              },
              {
                id: 'support',
                title: 'Support Hub',
                description: 'Open a case with the Elastic support team.',
                icon: 'help',
                href: supportUrl,
              },
            ].map((item) => (
              <EuiCard
                key={item.id}
                layout="horizontal"
                icon={
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <EuiIcon type={item.icon} size="m" color={euiTheme.colors.primary} />
                  </div>
                }
                title={item.title}
                titleElement="h4"
                titleSize="xs"
                description={item.description}
                href={item.href}
                target="_blank"
                hasBorder
                paddingSize="none"
                css={css`
                  border-radius: 6px;
                  padding: 16px;
                  box-shadow: none;
                  cursor: pointer;
                  .euiCard__top {
                    margin-inline-end: 12px;
                    flex-shrink: 0;
                    align-self: flex-start;
                  }
                  .euiCard__title {
                    font-family: ${euiTheme.font.family};
                    font-weight: ${euiTheme.font.weight.bold};
                    color: ${euiTheme.colors.text};
                  }
                  .euiCard__content,
                  .euiCard__children {
                    margin-bottom: 0;
                    padding-bottom: 0;
                  }
                  & [class*='euiCard__description'] {
                    margin-block-start: 4px !important;
                  }
                `}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
