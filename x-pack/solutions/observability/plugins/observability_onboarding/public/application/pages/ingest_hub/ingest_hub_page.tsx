/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { useParams, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import {
  EuiAccordion,
  EuiAvatar,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFieldPassword,
  EuiFieldSearch,
  EuiFieldText,
  EuiFilterButton,
  EuiFilterGroup,
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
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingElastic,
  EuiNotificationBadge,
  EuiPageTemplate,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSideNav,
  EuiSpacer,
  EuiStat,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useActiveVersion } from '../../version_switcher_widget';
import {
  INGEST_HUB_ADD_DATA_NAV_ID,
  isIngestHubVersion2AddDataPage,
} from './ingest_hub_experience_targets';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { Version2ApiEndpointsSplit } from '../../version_2_api_endpoints_split';
import { Version3ApiEndpointsSplit } from '../../version_3_api_endpoints_split';
import {
  getFleetEnrollmentBaseHref,
  resolveVersion1HeaderCreateApiKeyTargetEndpointId,
  Version1ApiEndpointsHeaderCredentialSplit,
} from '../../version_1_api_endpoints_header_credential_split';
import {
  SECTIONS,
  SAAS_TILES,
  EXPAND_STACK_TILES,
  OBSERVABILITY_INTEGRATIONS,
  PACKAGES,
  PACKAGE_CATEGORY_MAP,
  PACKAGE_CATEGORIES,
  ASSET_TILES,
  ASSET_CATEGORIES,
  CONNECTOR_TILES,
  CONNECTOR_CATEGORIES,
  INTEGRATION_CATEGORIES,
  LOGO_FALLBACK,
  AWS_INSTALLED_INTEGRATIONS_TABLE,
  API_INGESTION_TILES,
  API_ENDPOINTS,
} from './ingest_hub_data';
import type { IntegrationTile, InstalledIntegrationRow, ApiIngestionTile } from './ingest_hub_data';
import { IntegrationCard, CompactIntegrationCard, CardLogoIcon } from './ingest_hub_components';
import { KubernetesFlyout } from './kubernetes_flyout';
import { AwsFlyout } from './aws_flyout';
import { CrowdStrikeFlyout } from './crowdstrike_flyout';
import rocketImg from './assets/rocket.png';
import integrationsHeaderImg from './assets/integrations-header.png';
import apiEndpointHeaderImg from './assets/api-endpoint-header.png';
import platformMigrationHeaderImg from './assets/platform-migration-header.png';
import dashboardsHeaderImg from './assets/dashboards-header.png';
import rulesHeaderImg from './assets/rules-header.png';
import { StreamsWelcomeBannerImage } from './streams_welcome_banner_image';
import { StreamsReplicatedTable } from './streams_replicated_table';

type TaggedTile = IntegrationTile & { badge?: string };

const attachHideIntegrationLogoOnError = (img: HTMLImageElement | null) => {
  if (!img) return;
  const onError = () => {
    img.style.display = 'none';
    img.removeEventListener('error', onError);
  };
  img.addEventListener('error', onError);
};

// ── AI SourceMap data flow view ──────────────────────────────────────────────
interface AiDataSource {
  id: string;
  name: string;
  category: 'cloud' | 'containers' | 'host' | 'applications' | 'saas';
  logoDomain: string;
  volume: string;
  events: string;
}

interface AiSourceWizard {
  step: 1 | 2 | 3 | 4;
  authMethod: 'iam' | 'access-key' | 'existing-agent' | null;
  accessKeyId: string;
  secretAccessKey: string;
  authConfirmed: boolean;
  dataTypes: string[];
  dataTypesConfirmed: boolean;
  services: string[];
  servicesConfirmed: boolean;
  isLive: boolean;
}

const AI_DATA_SOURCES: AiDataSource[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    category: 'cloud',
    logoDomain: 'amazon_web_services',
    volume: '3.6 GB/h',
    events: '18.2k ev/s',
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    category: 'cloud',
    logoDomain: 'gcp',
    volume: '1.3 GB/h',
    events: '6.7k ev/s',
  },
  {
    id: 'azure',
    name: 'Azure',
    category: 'cloud',
    logoDomain: 'azure',
    volume: '2.7 GB/h',
    events: '9.4k ev/s',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'containers',
    logoDomain: 'kubernetes',
    volume: '4.2 GB/h',
    events: '12.4k ev/s',
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'containers',
    logoDomain: 'docker',
    volume: '1.7 GB/h',
    events: '5.4k ev/s',
  },
  {
    id: 'amazon-ecs',
    name: 'Amazon ECS',
    category: 'containers',
    logoDomain: 'amazon_web_services',
    volume: '3.1 GB/h',
    events: '9.8k ev/s',
  },
  {
    id: 'linux',
    name: 'Linux',
    category: 'host',
    logoDomain: 'linux',
    volume: '1.8 GB/h',
    events: '11.2k ev/s',
  },
  {
    id: 'windows',
    name: 'Windows',
    category: 'host',
    logoDomain: 'microsoft',
    volume: '0.9 GB/h',
    events: '5.1k ev/s',
  },
  {
    id: 'macos',
    name: 'macOS',
    category: 'host',
    logoDomain: 'macos',
    volume: '0.4 GB/h',
    events: '2.3k ev/s',
  },
  {
    id: 'opentelemetry',
    name: 'OpenTelemetry',
    category: 'applications',
    logoDomain: 'opentelemetry',
    volume: '2.4 GB/h',
    events: '16.8k ev/s',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    category: 'applications',
    logoDomain: 'prometheus',
    volume: '0.2 GB/h',
    events: '3.9k ev/s',
  },
  {
    id: 'fluent-bit',
    name: 'Fluent Bit',
    category: 'applications',
    logoDomain: 'fluentbit',
    volume: '3.1 GB/h',
    events: '222k ev/s',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'saas',
    logoDomain: 'salesforce',
    volume: '0.3 GB/h',
    events: '1.8k ev/s',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'saas',
    logoDomain: 'slack',
    volume: '0.2 GB/h',
    events: '5.2k ev/s',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    category: 'saas',
    logoDomain: 'atlassian',
    volume: '0.1 GB/h',
    events: '0.4k ev/s',
  },
];

const AI_SOURCE_CATEGORIES: ReadonlyArray<{ id: AiDataSource['category']; label: string }> = [
  { id: 'cloud', label: 'Cloud' },
  { id: 'containers', label: 'Containers' },
  { id: 'host', label: 'Host' },
  { id: 'applications', label: 'Applications' },
  { id: 'saas', label: 'SaaS Products' },
];
// ────────────────────────────────────────────────────────────────────────────

const SECTION_TO_NAV_ID: Record<string, string> = {
  integrations: 'integrations',
  'platform-migration': 'platform-migration',
  dashboards: 'migration-dashboards',
  rules: 'migration-rules',
  'data-management': 'data-management',
};

export const IngestHubPage: React.FC = () => {
  const { services } = useKibana<ObservabilityOnboardingAppServices>();
  const [activeVersion] = useActiveVersion();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();
  const routeMatch = useRouteMatch<{ section?: string }>();
  const basePath = routeMatch.path.replace('/:section?', '');
  const { section: routeSection } = useParams<{ section?: string }>();
  const initialNavId =
    (routeSection && SECTION_TO_NAV_ID[routeSection]) || routeSection || 'get-started';
  const [activeNavId, setActiveNavId] = useState<string>(initialNavId);

  useEffect(() => {
    const navId =
      (routeSection && SECTION_TO_NAV_ID[routeSection]) || routeSection || 'get-started';
    setActiveNavId(navId);
  }, [routeSection]);

  useEffect(() => {
    if (activeVersion === 'aiSourceMap' && activeNavId !== 'integrations') {
      history.replace(`${basePath}/integrations`);
    }
  }, [activeVersion, activeNavId, basePath, history]);

  const streamsEmptyPromptRef = React.useRef<HTMLDivElement | null>(null);
  const [streamsEmptyPromptEl, setStreamsEmptyPromptEl] = React.useState<HTMLDivElement | null>(
    null
  );
  useEffect(() => {
    if (!streamsEmptyPromptEl || activeVersion !== 'streamsUx' || !services.streamsApp) return;
    const unmount = services.streamsApp.renderEmbeddedStreamsEmptyPrompt(streamsEmptyPromptEl);
    return unmount;
  }, [streamsEmptyPromptEl, activeVersion, services.streamsApp]);

  const sectionPadding = euiTheme.size.l;
  const paddedContent = css`
    padding-left: ${sectionPadding};
    padding-right: ${sectionPadding};
  `;
  const dividerStyle = css`
    margin-left: ${euiTheme.size.m};
    margin-right: ${euiTheme.size.m};
  `;

  const [integrationsTab, setIntegrationsTab] = useState<
    'all' | 'installed' | 'packages' | 'assets' | 'connectors'
  >('all');
  const [installedTabSearch, setInstalledTabSearch] = useState('');
  const [selectedInstalledRows, setSelectedInstalledRows] = useState<InstalledIntegrationRow[]>([]);
  const [isInstalledActionsOpen, setIsInstalledActionsOpen] = useState(false);
  const [step1Tab, setStep1Tab] = useState<'integrations' | 'migration'>('integrations');
  const categoryFromSearch = new URLSearchParams(location.search).get('category');
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    categoryFromSearch === 'api-ingestion' ? 'all-api-ingestion' : 'all'
  );
  useEffect(() => {
    if (new URLSearchParams(location.search).get('category') === 'api-ingestion') {
      setSelectedCategory('all-api-ingestion');
    }
  }, [location.search]);
  const [integrationsSearch, setIntegrationsSearch] = useState<string>('');
  const [version2ApiEndpointId, setVersion2ApiEndpointId] = useState<string>(
    API_ENDPOINTS[0]?.id ?? 'endpoint-otlp'
  );
  const [version2ApiEndpointSecrets, setVersion2ApiEndpointSecrets] = useState<
    Record<string, string>
  >({});
  const [version3ApiEndpointId, setVersion3ApiEndpointId] = useState<string>(
    API_ENDPOINTS[0]?.id ?? 'endpoint-otlp'
  );
  const [version3ApiEndpointSecrets, setVersion3ApiEndpointSecrets] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (
      (activeVersion !== 'version1' &&
        activeVersion !== 'version2' &&
        activeVersion !== 'version3') ||
      selectedCategory !== 'all-api-ingestion'
    ) {
      return;
    }
    const q = integrationsSearch.trim().toLowerCase();
    const filtered = !q
      ? API_ENDPOINTS
      : API_ENDPOINTS.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.detailTitle.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.details.toLowerCase().includes(q)
        );
    if (filtered.length === 0) {
      return;
    }
    if (activeVersion === 'version3') {
      if (!filtered.some((e) => e.id === version3ApiEndpointId)) {
        setVersion3ApiEndpointId(filtered[0].id);
      }
    } else if (!filtered.some((e) => e.id === version2ApiEndpointId)) {
      setVersion2ApiEndpointId(filtered[0].id);
    }
  }, [
    activeVersion,
    selectedCategory,
    integrationsSearch,
    version2ApiEndpointId,
    version3ApiEndpointId,
  ]);

  const version1HeaderCredentialTargetEndpointId = useMemo(
    () => resolveVersion1HeaderCreateApiKeyTargetEndpointId(version2ApiEndpointId),
    [version2ApiEndpointId]
  );
  const version1EnrollmentFleetHref = useMemo(
    () => getFleetEnrollmentBaseHref(window.location.origin),
    []
  );

  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [isSignalsPopoverOpen, setIsSignalsPopoverOpen] = useState(false);
  const [isSetupPopoverOpen, setIsSetupPopoverOpen] = useState(false);
  const [isSortPopoverOpen, setIsSortPopoverOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState([
    { label: 'Beta', checked: undefined as 'on' | undefined },
    { label: 'Deprecated', checked: undefined as 'on' | undefined },
  ]);
  const [signalsOptions, setSignalsOptions] = useState([
    { label: 'Logs', checked: undefined as 'on' | undefined },
    { label: 'Metrics', checked: undefined as 'on' | undefined },
  ]);
  const [setupOptions, setSetupOptions] = useState([
    { label: 'Agentless', checked: undefined as 'on' | undefined },
    { label: 'Elastic Agent', checked: undefined as 'on' | undefined },
    { label: 'Beats', checked: undefined as 'on' | undefined },
  ]);
  const [sortOptions, setSortOptions] = useState([
    { label: 'Name (A\u2013Z)', checked: 'on' as 'on' | undefined },
    { label: 'Name (Z\u2013A)', checked: undefined as 'on' | undefined },
    { label: 'Recently added', checked: undefined as 'on' | undefined },
  ]);
  const [flyoutTile, setFlyoutTile] = useState<(IntegrationTile | ApiIngestionTile) | null>(null);

  const [packagesSearch, setPackagesSearch] = useState('');
  const [packagesCategory, setPackagesCategory] = useState('all');
  const [assetsSearch, setAssetsSearch] = useState('');
  const [assetsCategory, setAssetsCategory] = useState('all');
  const [connectorsSearch, setConnectorsSearch] = useState('');
  const [connectorsCategory, setConnectorsCategory] = useState('all');

  // AI SourceMap data flow view state
  const [aiSourceFilter, setAiSourceFilter] = useState('');
  const [aiActiveSourceIds, setAiActiveSourceIds] = useState<string[]>([]);
  const [aiSelectedSourceId, setAiSelectedSourceId] = useState<string | null>(null);
  const [aiWizardStates, setAiWizardStates] = useState<Record<string, AiSourceWizard>>({});

  const updateAiWizard = (sourceId: string, updates: Partial<AiSourceWizard>) => {
    setAiWizardStates((prev) => ({
      ...prev,
      [sourceId]: {
        step: 1 as const,
        authMethod: null,
        accessKeyId: '',
        secretAccessKey: '',
        authConfirmed: false,
        dataTypes: [],
        dataTypesConfirmed: false,
        services: [],
        servicesConfirmed: false,
        isLive: false,
        ...(prev[sourceId] ?? {}),
        ...updates,
      },
    }));
  };

  const allIntegrations = [...SECTIONS.flatMap((s) => s.tiles), ...OBSERVABILITY_INTEGRATIONS];
  const seen = new Set<string>();
  const unique = allIntegrations.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  const accordionCss = css`
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: 8px;
    overflow: hidden;
    & > .euiAccordion__triggerWrapper {
      padding: 24px;
      position: relative;
      cursor: pointer;
      text-decoration: none !important;
    }
    & .euiAccordion__triggerWrapper * {
      text-decoration: none !important;
    }
    & > .euiAccordion__triggerWrapper .euiAccordion__button {
      position: static;
      width: 100%;
    }
    & > .euiAccordion__triggerWrapper .euiAccordion__buttonContent {
      width: 100%;
    }
    & > .euiAccordion__triggerWrapper .euiAccordion__button::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    & .euiAccordion__children {
      padding: 0 24px 24px;
    }
    & .euiAccordion__children > .euiEmptyPrompt {
      max-width: 100% !important;
      margin-inline-start: 0 !important;
    }
    & .euiAccordion__triggerWrapper > .euiFlexGroup {
      gap: 16px;
    }
    & .euiAccordion__iconWrapper {
      margin-inline-end: 12px;
    }
  `;

  const sideNavCss = css`
    overflow: hidden;
    .euiSideNavItemButton__label {
      text-overflow: initial;
      white-space: normal;
      word-break: break-word;
    }
    .euiSideNav__heading {
      margin: 0 !important;
      padding: 0 !important;
      height: 0 !important;
      overflow: hidden;
    }
    > .euiSideNav__content > .euiSideNavItem--root > .euiSideNavItemButton {
      height: 0 !important;
      min-height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden;
    }
    > .euiSideNav__content > .euiSideNavItem--root > .euiSideNavItem__items {
      padding-top: 0 !important;
      margin-top: 0 !important;
    }
    > .euiSideNav__content
      > .euiSideNavItem--root
      > .euiSideNavItem__items
      > .euiSideNavItem:nth-child(6) {
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
    }
    > .euiSideNav__content
      > .euiSideNavItem--root
      > .euiSideNavItem__items
      > .euiSideNavItem:last-child {
      padding-left: 0 !important;
    }
    > .euiSideNav__content
      > .euiSideNavItem--root
      > .euiSideNavItem__items
      > .euiSideNavItem:last-child
      .euiSideNavItem__items {
      padding-left: 0 !important;
      margin-left: 0 !important;
      padding-top: 8px !important;
    }
  `;

  const compactSideNavCss = css`
    .euiSideNavItemButton {
      padding-top: 2px;
      padding-bottom: 2px;
      min-height: 24px;
    }
    .euiSideNavItem--root {
      margin-top: 0;
      padding-top: 0;
    }
    .euiSideNavItem--root + .euiSideNavItem--root {
      margin-top: 0;
      padding-top: 0;
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
      font-weight: 400;
      color: ${euiTheme.colors.textSubdued};
    }
  `;

  const renderSectionPageHeader = (imageSrc: string, heading: string, subtitle: string) => (
    <div
      style={{
        width: '100%',
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        paddingLeft: sectionPadding,
        paddingRight: sectionPadding,
        paddingTop: 24,
        paddingBottom: 24,
      }}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <div
            style={{
              backgroundColor: euiTheme.colors.backgroundBaseSubdued,
              borderRadius: 10,
              padding: 4,
              flexShrink: 0,
            }}
          >
            <img
              src={imageSrc}
              alt={heading}
              style={{ width: 48, height: 48, objectFit: 'contain', display: 'block' }}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>{heading}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText grow={false}>
            <p>{subtitle}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );

  const renderIntegrationGrid = (tiles: IntegrationTile[], badge: string, columns = 3) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12 }}>
      {tiles.map((tile) => (
        <IntegrationCard
          key={tile.id}
          name={tile.name}
          description={tile.description}
          logoDomain={tile.logoDomain}
          logoUrl={tile.logoUrl}
          badge={badge}
          onClick={() => setFlyoutTile(tile)}
        />
      ))}
    </div>
  );

  const renderSectionWithViewAll = (
    section: { title: string; description: string; tiles: IntegrationTile[] },
    onViewAll: () => void
  ) => (
    <>
      <EuiTitle
        size="xs"
        css={css`
          color: ${euiTheme.colors.textHeading};
        `}
      >
        <h2>{section.title}</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued" style={{ marginTop: 0 }}>
        <p style={{ margin: 0, display: 'inline' }}>{section.description}. </p>
        <EuiButtonEmpty
          data-test-subj="observabilityOnboardingRenderSectionWithViewAllButton"
          size="s"
          flush="left"
          iconType="arrowRight"
          iconSide="right"
          style={{ display: 'inline-flex', verticalAlign: 'baseline' }}
          css={css`
            & .euiButtonEmpty__content {
              gap: 0;
            }
          `}
          onClick={onViewAll}
        >
          View all {section.title}
        </EuiButtonEmpty>
      </EuiText>
      <EuiSpacer size="xl" />
      {renderIntegrationGrid(section.tiles)}
    </>
  );

  const renderPlatformMigrationContent = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <img
            src={`${LOGO_FALLBACK}/datadoghq/datadoghq-icon.svg`}
            alt="Datadog"
            style={{ width: 28, height: 28, objectFit: 'contain' }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <img
            src={`${LOGO_FALLBACK}/newrelic/newrelic-icon.svg`}
            alt="New Relic"
            style={{ width: 28, height: 28, objectFit: 'contain' }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <img
            src={`${LOGO_FALLBACK}/grafana/grafana-icon.svg`}
            alt="Grafana"
            style={{ width: 28, height: 28, objectFit: 'contain' }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiTitle size="xs">
        <h3>Switching Platforms?</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        Import data from other platforms seamlessly with our migration tools
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiButton
        data-test-subj="observabilityOnboardingRenderPlatformMigrationContentMigrateDataButton"
        color="primary"
        onClick={() => setActiveNavId('platform-migration')}
      >
        Migrate data
      </EuiButton>
    </div>
  );

  const renderFilterToolbar = (
    searchPlaceholder: string,
    searchValue: string,
    onSearchChange: (val: string) => void,
    showSetupFilter?: boolean,
    showSignalsFilter?: boolean
  ) => (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      wrap={false}
      style={{ marginBottom: 32 }}
    >
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj="observabilityOnboardingRenderFilterToolbarFieldSearch"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth
          compressed
          aria-label={searchPlaceholder}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          {showSetupFilter && (
            <EuiPopover
              button={
                <EuiFilterButton
                  iconType="arrowDown"
                  grow={false}
                  onClick={() => setIsSetupPopoverOpen(!isSetupPopoverOpen)}
                  isSelected={isSetupPopoverOpen}
                  hasActiveFilters={setupOptions.some((o) => o.checked === 'on')}
                  numActiveFilters={setupOptions.filter((o) => o.checked === 'on').length}
                >
                  Setup method
                </EuiFilterButton>
              }
              isOpen={isSetupPopoverOpen}
              closePopover={() => setIsSetupPopoverOpen(false)}
              panelPaddingSize="none"
            >
              <EuiSelectable
                options={setupOptions}
                onChange={(opts) => setSetupOptions(opts as typeof setupOptions)}
              >
                {(list) => <div style={{ width: 200 }}>{list}</div>}
              </EuiSelectable>
            </EuiPopover>
          )}
          {showSignalsFilter && (
            <EuiPopover
              button={
                <EuiFilterButton
                  iconType="arrowDown"
                  grow={false}
                  onClick={() => setIsSignalsPopoverOpen(!isSignalsPopoverOpen)}
                  isSelected={isSignalsPopoverOpen}
                  hasActiveFilters={signalsOptions.some((o) => o.checked === 'on')}
                  numActiveFilters={signalsOptions.filter((o) => o.checked === 'on').length}
                >
                  All signals
                </EuiFilterButton>
              }
              isOpen={isSignalsPopoverOpen}
              closePopover={() => setIsSignalsPopoverOpen(false)}
              panelPaddingSize="none"
            >
              <EuiSelectable
                options={signalsOptions}
                onChange={(opts) => setSignalsOptions(opts as typeof signalsOptions)}
              >
                {(list) => <div style={{ width: 200 }}>{list}</div>}
              </EuiSelectable>
            </EuiPopover>
          )}
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                grow={false}
                onClick={() => setIsStatusPopoverOpen(!isStatusPopoverOpen)}
                isSelected={isStatusPopoverOpen}
                hasActiveFilters={statusOptions.some((o) => o.checked === 'on')}
                numActiveFilters={statusOptions.filter((o) => o.checked === 'on').length}
              >
                Status
              </EuiFilterButton>
            }
            isOpen={isStatusPopoverOpen}
            closePopover={() => setIsStatusPopoverOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable
              options={statusOptions}
              onChange={(opts) => setStatusOptions(opts as typeof statusOptions)}
            >
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                grow={false}
                onClick={() => setIsSortPopoverOpen(!isSortPopoverOpen)}
                isSelected={isSortPopoverOpen}
              >
                {sortOptions.find((o) => o.checked === 'on')?.label ?? 'Sort'}
              </EuiFilterButton>
            }
            isOpen={isSortPopoverOpen}
            closePopover={() => setIsSortPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiSelectable
              singleSelection
              options={sortOptions}
              onChange={(opts) => {
                setSortOptions(opts as typeof sortOptions);
                setIsSortPopoverOpen(false);
              }}
            >
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderCategoryFilteredGrid = (
    tiles: IntegrationTile[],
    badgeLabel: string,
    categories: string[],
    category: string,
    setCategory: (c: string) => void,
    search: string,
    setSearch: (s: string) => void,
    filterFn?: (t: IntegrationTile, cat: string) => boolean
  ) => {
    const rawQ = search
      .replace(/^category:\S*/i, '')
      .trim()
      .toLowerCase();
    const byCategory =
      category === 'all'
        ? tiles
        : tiles.filter((t) =>
            filterFn ? filterFn(t, category) : t.name.toLowerCase().includes(category.toLowerCase())
          );
    const filtered = rawQ
      ? byCategory.filter(
          (t) =>
            t.name.toLowerCase().includes(rawQ) ||
            (t.description?.toLowerCase().includes(rawQ) ?? false)
        )
      : byCategory;

    return (
      <>
        {renderFilterToolbar(`Search ${badgeLabel.toLowerCase()}s...`, search, (val) => {
          setSearch(val);
          const catMatch = val.match(/^category:(.+)$/i);
          if (catMatch) {
            const name = catMatch[1].trim();
            const found = categories.find((c) => c.toLowerCase() === name.toLowerCase());
            setCategory(found ?? (name.toLowerCase() === 'all' ? 'all' : category));
          } else {
            setCategory(val.trim() === '' ? 'all' : category);
          }
        })}
        <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
          <EuiFlexItem
            grow={false}
            style={{
              width: 200,
              minWidth: 200,
              maxWidth: 200,
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
            }}
          >
            <EuiSideNav
              heading=""
              headingProps={{ screenReaderOnly: true }}
              items={[
                {
                  id: `${badgeLabel}-all`,
                  name:
                    badgeLabel === 'Input package'
                      ? 'All input packages'
                      : badgeLabel === 'Asset'
                      ? 'All assets'
                      : badgeLabel === 'Connector'
                      ? 'All connectors'
                      : `All ${badgeLabel.toLowerCase()}s`,
                  isSelected: category === 'all',
                  onClick: () => {
                    setCategory('all');
                    setSearch('category:All');
                  },
                },
                ...categories.map((cat) => ({
                  id: `${badgeLabel}-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                  name: cat,
                  isSelected: category === cat,
                  onClick: () => {
                    setCategory(cat);
                    setSearch(`category:${cat}`);
                  },
                })),
              ]}
              css={compactSideNavCss}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {filtered.map((tile) => (
                <IntegrationCard
                  key={tile.id}
                  name={tile.name}
                  description={tile.description}
                  logoDomain={tile.logoDomain}
                  logoUrl={tile.logoUrl}
                  badge={badgeLabel}
                  onClick={() => setFlyoutTile(tile)}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <EuiText color="subdued">
                No {badgeLabel.toLowerCase()}s found in this category.
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  const renderIntegrationsView = () => {
    return (
      <>
        {renderSectionPageHeader(
          integrationsHeaderImg,
          'Add data to Elastic Observability',
          'Monitor your applications and infrastructure with powerful logs, metrics, traces, and AI-driven insights'
        )}
        {activeVersion !== 'streamsUx' && (
          <div css={paddedContent} style={{ width: '100%' }}>
            <EuiTabs
              css={css`
                box-shadow: none;
                border-bottom: none;
              `}
            >
              <EuiTab
                isSelected={integrationsTab === 'all'}
                onClick={() => setIntegrationsTab('all')}
              >
                Browse all
              </EuiTab>
              <EuiTab
                isSelected={integrationsTab === 'installed'}
                onClick={() => setIntegrationsTab('installed')}
                append={(() => {
                  const hasAwsInstalled = sessionStorage.getItem('ingestHub:dataAdded') === 'true';
                  const count = hasAwsInstalled ? AWS_INSTALLED_INTEGRATIONS_TABLE.length : 0;
                  return count > 0 ? (
                    <EuiNotificationBadge className="eui-alignCenter" size="m">
                      {count}
                    </EuiNotificationBadge>
                  ) : undefined;
                })()}
              >
                Installed
              </EuiTab>
            </EuiTabs>
          </div>
        )}
        <EuiHorizontalRule margin="none" />
        <div css={paddedContent} style={{ width: '100%' }}>
          <div style={{ height: 32 }} />

          {integrationsTab === 'all' && renderBrowseAllTab()}
          {integrationsTab === 'packages' &&
            renderCategoryFilteredGrid(
              PACKAGES,
              'Input package',
              PACKAGE_CATEGORIES,
              packagesCategory,
              setPackagesCategory,
              packagesSearch,
              setPackagesSearch,
              (t, cat) => {
                const catKey = cat.toLowerCase().replace(/\s+/g, '-');
                return PACKAGE_CATEGORY_MAP[catKey]?.includes(t.id) ?? false;
              }
            )}
          {integrationsTab === 'assets' &&
            renderCategoryFilteredGrid(
              ASSET_TILES,
              'Asset',
              ASSET_CATEGORIES,
              assetsCategory,
              setAssetsCategory,
              assetsSearch,
              setAssetsSearch
            )}
          {integrationsTab === 'connectors' &&
            renderCategoryFilteredGrid(
              CONNECTOR_TILES,
              'Connector',
              CONNECTOR_CATEGORIES,
              connectorsCategory,
              setConnectorsCategory,
              connectorsSearch,
              setConnectorsSearch
            )}
          {integrationsTab === 'installed' &&
            (() => {
              // Same in Block UX and Skip UX: show filled table when user completed AWS "See my data" flow
              const hasAwsInstalled = sessionStorage.getItem('ingestHub:dataAdded') === 'true';

              if (!hasAwsInstalled) {
                return (
                  <EuiEmptyPrompt
                    color="plain"
                    iconType="package"
                    title={
                      <h2>
                        {i18n.translate(
                          'xpack.observability_onboarding.ingestHub.installedTab.emptyPromptTitle',
                          {
                            defaultMessage: 'No installed data sources yet',
                          }
                        )}
                      </h2>
                    }
                    body={
                      <p>
                        {i18n.translate(
                          'xpack.observability_onboarding.ingestHub.installedTab.emptyPromptBody',
                          {
                            defaultMessage:
                              'Complete a get started flow (for example AWS and See my data) to preview installed integrations here. You can also browse all data sources to explore options.',
                          }
                        )}
                      </p>
                    }
                    actions={
                      <EuiButton
                        data-test-subj="observabilityOnboardingRenderIntegrationsViewBrowseAllButton"
                        fill
                        onClick={() => setIntegrationsTab('all')}
                      >
                        {i18n.translate(
                          'xpack.observability_onboarding.ingestHub.installedTab.browseAllButton',
                          { defaultMessage: 'Browse all' }
                        )}
                      </EuiButton>
                    }
                  />
                );
              }

              const installedRows: InstalledIntegrationRow[] = AWS_INSTALLED_INTEGRATIONS_TABLE;
              const filteredRows = installedRows.filter((row) =>
                row.name.toLowerCase().includes(installedTabSearch.toLowerCase())
              );
              const upgradeCount = filteredRows.filter((r) => r.upgradeVersion).length;
              const actionsPanelItems = [
                <EuiContextMenuItem
                  key="upgrade"
                  icon="refresh"
                  onClick={() => setIsInstalledActionsOpen(false)}
                >
                  Upgrade
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="viewPolicies"
                  icon="search"
                  onClick={() => setIsInstalledActionsOpen(false)}
                >
                  View policies
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="edit"
                  icon="pencil"
                  onClick={() => setIsInstalledActionsOpen(false)}
                >
                  Edit integration
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="uninstall"
                  icon="trash"
                  onClick={() => setIsInstalledActionsOpen(false)}
                >
                  Uninstall integration
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="rollback"
                  icon="arrowLeft"
                  onClick={() => setIsInstalledActionsOpen(false)}
                >
                  Rollback integration
                </EuiContextMenuItem>,
              ];
              return (
                <>
                  <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
                    <EuiFlexItem>
                      <EuiFieldSearch
                        data-test-subj="observabilityOnboardingRenderIntegrationsViewFieldSearch"
                        placeholder="Search"
                        value={installedTabSearch}
                        onChange={(e) =>
                          setInstalledTabSearch((e.target as HTMLInputElement).value)
                        }
                        fullWidth
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFilterGroup>
                        <EuiFilterButton
                          iconType="warning"
                          iconSide="left"
                          numFilters={upgradeCount}
                          css={css`
                            .euiIcon {
                              color: ${euiTheme.colors.textWarning};
                            }
                          `}
                        >
                          Upgrade
                        </EuiFilterButton>
                        <EuiFilterButton
                          iconType="error"
                          iconSide="left"
                          numFilters={0}
                          css={css`
                            .euiIcon {
                              color: ${euiTheme.colors.textDanger};
                            }
                          `}
                        >
                          Upgrade failed
                        </EuiFilterButton>
                        <EuiFilterButton
                          iconType="error"
                          iconSide="left"
                          numFilters={0}
                          css={css`
                            .euiIcon {
                              color: ${euiTheme.colors.textDanger};
                            }
                          `}
                        >
                          Install failed
                        </EuiFilterButton>
                      </EuiFilterGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFilterGroup>
                        <EuiFilterButton numFilters={0}>Custom</EuiFilterButton>
                      </EuiFilterGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiPopover
                        button={
                          <EuiButton
                            data-test-subj="observabilityOnboardingRenderIntegrationsViewActionsButton"
                            iconType="arrowDown"
                            iconSide="right"
                            onClick={() => setIsInstalledActionsOpen((open) => !open)}
                          >
                            Actions
                          </EuiButton>
                        }
                        isOpen={isInstalledActionsOpen}
                        closePopover={() => setIsInstalledActionsOpen(false)}
                        anchorPosition="downRight"
                      >
                        <EuiContextMenuPanel size="s" items={actionsPanelItems} />
                      </EuiPopover>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                  <EuiText color="subdued" size="s">
                    Showing {filteredRows.length} integration{filteredRows.length !== 1 ? 's' : ''}
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiBasicTable<InstalledIntegrationRow>
                    items={filteredRows}
                    itemId="id"
                    tableCaption="Installed integrations"
                    selection={{
                      selectable: () => true,
                      selectableMessage: () => 'Select',
                      onSelectionChange: (newSelection) => setSelectedInstalledRows(newSelection),
                      selected: selectedInstalledRows,
                    }}
                    rowProps={{ 'data-test-subj': 'installedIntegrationsTableRow' }}
                    columns={[
                      {
                        name: 'Integration name',
                        render: (row: InstalledIntegrationRow) => (
                          <EuiLink
                            data-test-subj="observabilityOnboardingRenderIntegrationsViewLink"
                            href="#"
                            color="text"
                          >
                            <EuiFlexGroup gutterSize="s" alignItems="center">
                              <EuiFlexItem grow={false}>
                                {row.logoUrl ? (
                                  <span role="img" aria-hidden style={{ display: 'flex' }}>
                                    <img
                                      src={row.logoUrl}
                                      alt=""
                                      style={{ width: 24, height: 24, objectFit: 'contain' }}
                                    />
                                  </span>
                                ) : (
                                  <EuiIcon type="package" size="m" />
                                )}
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>{row.name}</EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiLink>
                        ),
                      },
                      {
                        name: 'Version',
                        render: (row: InstalledIntegrationRow) =>
                          row.upgradeVersion ? (
                            <EuiButtonEmpty
                              data-test-subj="observabilityOnboardingRenderIntegrationsViewButton"
                              size="s"
                              iconType="gear"
                              flush="left"
                              onClick={() => {}}
                            >
                              Upgrade to {row.upgradeVersion}
                            </EuiButtonEmpty>
                          ) : (
                            <EuiFlexGroup gutterSize="s" alignItems="center">
                              <EuiFlexItem grow={false}>
                                <EuiIcon type="checkInCircleFilled" color="success" size="m" />
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>{row.version}</EuiFlexItem>
                            </EuiFlexGroup>
                          ),
                      },
                      {
                        field: 'dashboards',
                        name: 'Dashboards',
                        render: (d: number) =>
                          d > 0 ? (
                            <EuiLink
                              data-test-subj="observabilityOnboardingRenderIntegrationsViewLink"
                              href="#"
                            >
                              {d}
                            </EuiLink>
                          ) : (
                            '-'
                          ),
                      },
                      {
                        field: 'rules',
                        name: 'Rules',
                        render: (r: number) => (r > 0 ? r : '-'),
                      },
                      {
                        field: 'attachedPolicies',
                        name: 'Attached policies',
                        render: (n: number) =>
                          n > 0 ? (
                            <EuiLink
                              data-test-subj="observabilityOnboardingRenderIntegrationsViewLink"
                              href="#"
                            >
                              View {n} {n === 1 ? 'policy' : 'policies'}
                            </EuiLink>
                          ) : (
                            '-'
                          ),
                      },
                      {
                        actions: [
                          {
                            name: 'Upgrade',
                            icon: 'refresh',
                            type: 'icon' as const,
                            onClick: () => {},
                            enabled: (row) => !!row.upgradeVersion,
                          },
                          {
                            name: 'View policies',
                            icon: 'search',
                            type: 'icon' as const,
                            onClick: () => {},
                          },
                          {
                            name: 'Edit integration',
                            icon: 'pencil',
                            type: 'icon' as const,
                            onClick: () => {},
                          },
                          {
                            name: 'Uninstall integration',
                            icon: 'trash',
                            type: 'icon' as const,
                            onClick: () => {},
                          },
                          {
                            name: 'Rollback integration',
                            icon: 'arrowLeft',
                            type: 'icon' as const,
                            onClick: () => {},
                          },
                        ],
                      },
                    ]}
                  />
                </>
              );
            })()}
        </div>
      </>
    );
  };

  /**
   * Add data (`integrations`) for Onboarding Experience Version 2 only.
   * Other versions use {@link renderIntegrationsView}; fork UI here when v2 should diverge.
   */
  const renderVersion2AddDataView = () => renderIntegrationsView();

  const renderCompactGrid = (
    tiles: IntegrationTile[],
    badge?: string,
    columns?: number,
    onTileClick?: (tile: IntegrationTile) => void
  ) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns ?? tiles.length}, 1fr)`,
        gap: 8,
      }}
    >
      {tiles.map((tile) => (
        <CompactIntegrationCard
          key={tile.id}
          name={tile.name}
          description={tile.description}
          badge={badge}
          logoUrl={tile.logoUrl}
          logoDomain={tile.logoDomain}
          onClick={() => (onTileClick ? onTileClick(tile) : setFlyoutTile(tile))}
        />
      ))}
    </div>
  );

  const isSkipLikeVersion =
    activeVersion === 'streamsUx' ||
    activeVersion === 'agentUx' ||
    activeVersion === 'aiSourceMap' ||
    activeVersion === 'version1' ||
    activeVersion === 'version2' ||
    activeVersion === 'version3';
  const isStopVersion = isSkipLikeVersion;
  const hasAddedData = sessionStorage.getItem('ingestHub:dataAdded') === 'true';
  const isStopFillVersion = activeVersion === 'blockUx' && !hasAddedData;
  const [leavingForDiscover, setLeavingForDiscover] = useState(false);
  const [isGetStartedFlyoutOpen, setIsGetStartedFlyoutOpen] = useState(() => {
    const onGetStarted = !routeSection || routeSection === 'get-started';
    const skipLikeWithData =
      isSkipLikeVersion && sessionStorage.getItem('ingestHub:dataAdded') === 'true';
    return onGetStarted && !skipLikeWithData;
  });
  const [welcomeChildTile, setWelcomeChildTile] = useState<IntegrationTile | null>(null);

  useEffect(() => {
    if (!routeSection || routeSection === 'get-started') {
      // Skip/Agent UX: don't show Welcome flyout when user has already added fake AWS data (start state only)
      const skipLikeWithData =
        isSkipLikeVersion && sessionStorage.getItem('ingestHub:dataAdded') === 'true';
      if (skipLikeWithData) {
        setIsGetStartedFlyoutOpen(false);
      } else {
        setIsGetStartedFlyoutOpen(true);
        setWelcomeChildTile(null);
      }
    }
  }, [activeVersion, isSkipLikeVersion, routeSection]);

  useEffect(() => {
    if (!isStopFillVersion || leavingForDiscover) return;
    const appEl = document.querySelector('.kbnChromeLayoutApplication');
    const gridRoot = appEl?.parentElement;
    if (!gridRoot) return;
    const originalColumns = gridRoot.style.gridTemplateColumns;
    const originalMarginRight = (appEl as HTMLElement).style.marginRight;
    const originalWidth = (appEl as HTMLElement).style.width;
    const originalGridBg = gridRoot.style.background;
    gridRoot.style.setProperty('grid-template-columns', '0px 1fr 0px', 'important');
    gridRoot.style.setProperty('background', '#fff', 'important');
    (appEl as HTMLElement).style.setProperty('margin-left', '24px', 'important');
    (appEl as HTMLElement).style.setProperty('margin-right', '24px', 'important');
    (appEl as HTMLElement).style.setProperty('width', 'calc(100% - 48px)', 'important');
    return () => {
      gridRoot.style.removeProperty('grid-template-columns');
      gridRoot.style.removeProperty('background');
      if (originalColumns) gridRoot.style.gridTemplateColumns = originalColumns;
      if (originalGridBg) gridRoot.style.background = originalGridBg;
      (appEl as HTMLElement).style.removeProperty('margin-left');
      (appEl as HTMLElement).style.removeProperty('margin-right');
      (appEl as HTMLElement).style.removeProperty('width');
      if (originalMarginRight) (appEl as HTMLElement).style.marginRight = originalMarginRight;
      if (originalWidth) (appEl as HTMLElement).style.width = originalWidth;
    };
  }, [isStopFillVersion, leavingForDiscover]);

  useEffect(() => {
    if (isSkipLikeVersion) {
      services.chrome?.sideNav.setIsCollapsed(false);
    }
  }, [isSkipLikeVersion, services.chrome]);

  const renderAddDataRecommendedContent = () => {
    return (
      <>
        <EuiTitle size="xs">
          <h2>Recommendations</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            Curated groups to help you find the right data sources for your environment. Open a
            category to browse the full catalogue.
          </p>
        </EuiText>
        <EuiSpacer size="xxl" />
        {SECTIONS.map((section, idx) => {
          const categoryMap: Record<string, string> = {
            Cloud: 'Cloud',
            Containers: 'Containers',
            Host: 'Operating Systems',
            Applications: 'Application',
          };
          const integrationCategory = categoryMap[section.title] || section.title;
          return (
            <React.Fragment key={section.title}>
              {idx > 0 && <div style={{ height: 40 }} />}
              <EuiFlexGroup alignItems="baseline" gutterSize="xs" responsive={false} wrap={false}>
                <EuiFlexItem
                  grow={false}
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText size="s" color="subdued">
                    <p style={{ margin: 0, display: 'inline' }}>{section.description}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="observabilityOnboardingRenderAddDataRecommendedContentViewAllButton"
                    size="s"
                    flush="left"
                    iconType="arrowRight"
                    iconSide="right"
                    css={css`
                      & .euiButtonEmpty__content {
                        gap: 0;
                      }
                    `}
                    onClick={() => {
                      setSelectedCategory(`integration:${integrationCategory}`);
                    }}
                  >
                    View all
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
              <div style={{ height: 8 }} />
              {renderCompactGrid(section.tiles)}
            </React.Fragment>
          );
        })}
        {SAAS_TILES.length > 0 && (
          <>
            <div style={{ height: 40 }} />
            <EuiFlexGroup alignItems="baseline" gutterSize="xs" responsive={false} wrap={false}>
              <EuiFlexItem
                grow={false}
                css={css`
                  min-width: 0;
                `}
              >
                <EuiText size="s" color="subdued">
                  <p style={{ margin: 0, display: 'inline' }}>
                    Monitor your cloud resources without installing an agent.
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="observabilityOnboardingRenderAddDataRecommendedContentViewAllButton"
                  size="s"
                  flush="left"
                  iconType="arrowRight"
                  iconSide="right"
                  css={css`
                    & .euiButtonEmpty__content {
                      gap: 0;
                    }
                  `}
                  onClick={() => {
                    setSetupOptions((prev) =>
                      prev.map((o) => ({
                        ...o,
                        checked: o.label === 'Agentless' ? ('on' as const) : undefined,
                      }))
                    );
                  }}
                >
                  View all
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div style={{ height: 8 }} />
            {renderCompactGrid(SAAS_TILES)}
          </>
        )}
        <div style={{ height: 64 }} />
      </>
    );
  };

  const renderRecommendedContent = () => {
    return (
      <>
        <EuiTitle size="xs">
          <h2>Recommended</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>Popular integrations based on your infrastructure and use case.</p>
        </EuiText>
        <EuiSpacer size="xxl" />
        {SECTIONS.map((section, idx) => (
          <React.Fragment key={section.title}>
            {idx > 0 && <div style={{ height: 40 }} />}
            <EuiTitle
              size="xxs"
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              <h3>{section.title}</h3>
            </EuiTitle>
            <EuiSpacer size="xl" />
            {renderCompactGrid(section.tiles)}
          </React.Fragment>
        ))}
        {SAAS_TILES.length > 0 && (
          <>
            <div style={{ height: 40 }} />
            <EuiTitle
              size="xxs"
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              <h3>SaaS Products</h3>
            </EuiTitle>
            <EuiSpacer size="xl" />
            {renderCompactGrid(SAAS_TILES)}
          </>
        )}
        {EXPAND_STACK_TILES.length > 0 && (
          <>
            <div style={{ height: 40 }} />
            <EuiTitle
              size="xxs"
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              <h3>Services and databases often deployed alongside Kubernetes</h3>
            </EuiTitle>
            <div style={{ height: 8 }} />
            {renderCompactGrid(EXPAND_STACK_TILES, undefined, 3)}
          </>
        )}
        <div style={{ height: 64 }} />
      </>
    );
  };

  const renderBrowseAllTab = () => {
    const rawQ = integrationsSearch.trim().toLowerCase();

    const buildAll = (): TaggedTile[] => [
      ...unique.map((t) => ({ ...t, badge: 'Integration' as string | undefined })),
      ...PACKAGES.map((t) => ({ ...t, badge: 'Input package' as string | undefined })),
      ...ASSET_TILES.map((t) => ({ ...t, badge: 'Asset' as string | undefined })),
      ...CONNECTOR_TILES.map((t) => ({ ...t, badge: 'Connector' as string | undefined })),
      ...API_INGESTION_TILES.map((t) => ({ ...t, badge: 'API ingestion' as string | undefined })),
    ];
    const allItems = buildAll();

    const sectionKey = selectedCategory.split(':')[0] ?? '';
    const catValue = selectedCategory.split(':').slice(1).join(':') || '';

    const byCategory =
      selectedCategory === 'all'
        ? allItems
        : sectionKey === 'integration'
        ? unique
            .filter(
              (t) =>
                t.name.toLowerCase().includes(catValue.toLowerCase()) ||
                t.logoDomain.toLowerCase().includes(catValue.toLowerCase())
            )
            .map((t) => ({ ...t, badge: 'Integration' as string | undefined }))
        : sectionKey === 'package'
        ? PACKAGES.filter((t) => {
            const catKey = catValue.toLowerCase().replace(/\s+/g, '-');
            return (
              PACKAGE_CATEGORY_MAP[catKey]?.includes(t.id) ??
              t.name.toLowerCase().includes(catValue.toLowerCase())
            );
          }).map((t) => ({ ...t, badge: 'Input package' }))
        : sectionKey === 'asset'
        ? ASSET_TILES.filter((t) => t.name.toLowerCase().includes(catValue.toLowerCase())).map(
            (t) => ({ ...t, badge: 'Asset' })
          )
        : sectionKey === 'connector'
        ? CONNECTOR_TILES.filter((t) => t.name.toLowerCase().includes(catValue.toLowerCase())).map(
            (t) => ({ ...t, badge: 'Connector' })
          )
        : sectionKey === 'all-integrations'
        ? unique.map((t) => ({ ...t, badge: 'Integration' as string | undefined }))
        : sectionKey === 'all-packages'
        ? PACKAGES.map((t) => ({ ...t, badge: 'Input package' }))
        : sectionKey === 'all-assets'
        ? ASSET_TILES.map((t) => ({ ...t, badge: 'Asset' }))
        : sectionKey === 'all-connectors'
        ? CONNECTOR_TILES.map((t) => ({ ...t, badge: 'Connector' }))
        : sectionKey === 'all-api-ingestion'
        ? API_INGESTION_TILES.map((t) => ({ ...t, badge: 'API ingestion' }))
        : allItems;

    const matched = rawQ
      ? allItems.filter(
          (t) =>
            t.name.toLowerCase().includes(rawQ) ||
            (t.description?.toLowerCase().includes(rawQ) ?? false)
        )
      : byCategory;

    const activeSort = sortOptions.find((o) => o.checked === 'on')?.label;
    const sorted = [...matched].sort((a, b) => {
      if (activeSort === 'Name (A\u2013Z)') return a.name.localeCompare(b.name);
      if (activeSort === 'Name (Z\u2013A)') return b.name.localeCompare(a.name);
      return 0;
    });

    const getBrowseAllCatalogueHeader = (): { title: string; description: string } => {
      if (rawQ) {
        return {
          title: 'Search results',
          description:
            'Matches across integrations, input packages, assets, connectors, and API ingestion.',
        };
      }
      if (selectedCategory === 'all-api-ingestion') {
        return {
          title: 'API ingestion',
          description:
            'Send data using APM, the Elasticsearch API, the Kibana API, or Beats, Logstash, and Fleet-managed agents.',
        };
      }
      if (selectedCategory === 'all-integrations' || selectedCategory.startsWith('integration:')) {
        return {
          title: 'All integrations',
          description:
            'Browse Elastic integrations to collect logs, metrics, and traces from your stack.',
        };
      }
      if (selectedCategory === 'all-packages' || selectedCategory.startsWith('package:')) {
        return {
          title: 'All input packages',
          description:
            'Input packages and collectors for OpenTelemetry, metrics, custom pipelines, and more.',
        };
      }
      if (selectedCategory === 'all-assets' || selectedCategory.startsWith('asset:')) {
        return {
          title: 'All assets',
          description:
            'Pre-built dashboards and assets for OpenTelemetry, cloud, and infrastructure data.',
        };
      }
      if (selectedCategory === 'all-connectors' || selectedCategory.startsWith('connector:')) {
        return {
          title: 'All connectors',
          description:
            'Connect external data sources—cloud storage, databases, SaaS, and productivity tools.',
        };
      }
      return {
        title: 'All catalogue',
        description:
          'Complete catalogue of integrations, input packages, assets, connectors, and API ingestion.',
      };
    };

    const { title: catalogueTitle, description: catalogueDescription } =
      getBrowseAllCatalogueHeader();

    const browseAccordionSelectAll = (
      allId: 'all-integrations' | 'all-packages' | 'all-assets' | 'all-connectors',
      isInSection: (category: string) => boolean
    ) => {
      return ({
        onClick,
        children,
        ...buttonProps
      }: React.ComponentPropsWithoutRef<'button'> & { children?: React.ReactNode }) => (
        <button
          type="button"
          {...buttonProps}
          onClick={(e) => {
            onClick?.(e);
            if (!isInSection(selectedCategory)) {
              setSelectedCategory(allId);
            }
          }}
        >
          {children}
        </button>
      );
    };

    return (
      <>
        {renderFilterToolbar(
          'Search all...',
          integrationsSearch,
          (val) => {
            setIntegrationsSearch(val);
          },
          true,
          true
        )}
        <EuiFlexGroup
          gutterSize="none"
          alignItems="flexStart"
          css={css`
            gap: calc(${euiTheme.size.xxl} + ${euiTheme.size.l});
          `}
        >
          <EuiFlexItem
            grow={false}
            style={{
              width: 190,
              minWidth: 190,
              maxWidth: 190,
              position: 'sticky',
              top: 32,
              alignSelf: 'flex-start',
              maxHeight: 'calc(100vh - 232px)',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <EuiSideNav
              heading=""
              headingProps={{ screenReaderOnly: true }}
              items={[
                {
                  id: 'nav-root',
                  name: '',
                  forceOpen: true,
                  items: [
                    {
                      id: 'all',
                      name: 'Recommended',
                      icon: <EuiIcon type="starEmpty" size="m" />,
                      isSelected: selectedCategory === 'all',
                      onClick: () => {
                        setSelectedCategory('all');
                      },
                    },
                    {
                      id: 'nav-api-ingestion',
                      name: 'API ingestion',
                      icon: <EuiIcon type="editorCodeBlock" size="m" />,
                      isSelected: selectedCategory === 'all-api-ingestion',
                      onClick: () => {
                        setSelectedCategory('all-api-ingestion');
                      },
                    },
                    {
                      id: 'nav-integrations',
                      name: 'Integrations',
                      icon: <EuiIcon type="apps" size="m" />,
                      renderItem: browseAccordionSelectAll(
                        'all-integrations',
                        (c) => c === 'all-integrations' || c.startsWith('integration:')
                      ),
                      items: [
                        {
                          id: 'cat-int-all',
                          name: 'All integrations',
                          isSelected: selectedCategory === 'all-integrations',
                          onClick: () => {
                            setSelectedCategory('all-integrations');
                          },
                        },
                        ...INTEGRATION_CATEGORIES.map((cat) => ({
                          id: `cat-int-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `integration:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`integration:${cat}`);
                          },
                        })),
                      ],
                    },
                    {
                      id: 'nav-packages',
                      name: 'Input packages',
                      icon: <EuiIcon type="package" size="m" />,
                      renderItem: browseAccordionSelectAll(
                        'all-packages',
                        (c) => c === 'all-packages' || c.startsWith('package:')
                      ),
                      items: [
                        {
                          id: 'cat-pkg-all',
                          name: 'All input packages',
                          isSelected: selectedCategory === 'all-packages',
                          onClick: () => {
                            setSelectedCategory('all-packages');
                          },
                        },
                        ...PACKAGE_CATEGORIES.map((cat) => ({
                          id: `cat-pkg-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `package:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`package:${cat}`);
                          },
                        })),
                      ],
                    },
                    {
                      id: 'nav-assets',
                      name: 'Assets',
                      icon: <EuiIcon type="layers" size="m" />,
                      renderItem: browseAccordionSelectAll(
                        'all-assets',
                        (c) => c === 'all-assets' || c.startsWith('asset:')
                      ),
                      items: [
                        {
                          id: 'cat-asset-all',
                          name: 'All assets',
                          isSelected: selectedCategory === 'all-assets',
                          onClick: () => {
                            setSelectedCategory('all-assets');
                          },
                        },
                        ...ASSET_CATEGORIES.map((cat) => ({
                          id: `cat-asset-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `asset:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`asset:${cat}`);
                          },
                        })),
                      ],
                    },
                    {
                      id: 'nav-connectors',
                      name: 'Connectors',
                      icon: <EuiIcon type="link" size="m" />,
                      renderItem: browseAccordionSelectAll(
                        'all-connectors',
                        (c) => c === 'all-connectors' || c.startsWith('connector:')
                      ),
                      items: [
                        {
                          id: 'cat-conn-all',
                          name: 'All connectors',
                          isSelected: selectedCategory === 'all-connectors',
                          onClick: () => {
                            setSelectedCategory('all-connectors');
                          },
                        },
                        ...CONNECTOR_CATEGORIES.map((cat) => ({
                          id: `cat-conn-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `connector:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`connector:${cat}`);
                          },
                        })),
                      ],
                    },
                    {
                      id: 'nav-your-created',
                      name: 'Your created integrations',
                      items: [
                        {
                          id: 'nav-your-created-prompt',
                          name: '',
                          isSelected: false,
                          renderItem: () => (
                            <EuiEmptyPrompt
                              icon={<EuiIcon type="plusInCircle" size="m" color="subdued" />}
                              title={<h3>Create your own integration</h3>}
                              titleSize="xxxs"
                              body={
                                <EuiText size="xs" color="subdued">
                                  Build a custom integration that fits your specific requirements.
                                </EuiText>
                              }
                              actions={[
                                <EuiButtonEmpty
                                  data-test-subj="observabilityOnboardingRenderBrowseAllTabCreateIntegrationButton"
                                  size="xs"
                                  key="create"
                                >
                                  Create integration
                                </EuiButtonEmpty>,
                              ]}
                              color="subdued"
                              hasBorder
                              paddingSize="s"
                              css={css`
                                max-width: 100% !important;
                                min-width: 0 !important;
                                width: 100%;
                              `}
                            />
                          ),
                        },
                      ],
                    },
                  ],
                },
              ]}
              css={sideNavCss}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
            {selectedCategory === 'all' && !rawQ ? (
              renderAddDataRecommendedContent()
            ) : (activeVersion === 'version1' ||
                activeVersion === 'version2' ||
                activeVersion === 'version3') &&
              selectedCategory === 'all-api-ingestion' ? (
              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                alignItems="stretch"
                /* EuiFlexGroup replaces `css`; default flex-grow:1 stretched this column inside grow={1} */
                style={{
                  gap: 24,
                  flexGrow: 0,
                  alignSelf: 'flex-start',
                  width: '100%',
                  minWidth: 0,
                }}
              >
                <EuiFlexGroup
                  alignItems="flexEnd"
                  justifyContent="spaceBetween"
                  responsive={true}
                  gutterSize="m"
                  style={{ flexGrow: 0, width: '100%', minWidth: 0 }}
                >
                  <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                    <div>
                      <EuiTitle size="xs">
                        <h2>API endpoints</h2>
                      </EuiTitle>
                      <EuiSpacer size="xs" />
                      <EuiText size="s" color="subdued">
                        <p>
                          Direct access to your deployment&apos;s endpoints. Create an API key to
                          authenticate.{' '}
                          <EuiLink
                            data-test-subj={
                              activeVersion === 'version3'
                                ? 'obsOnboardingIngestHubV3ApiEndpointsDocumentation'
                                : activeVersion === 'version1'
                                ? 'obsOnboardingIngestHubV1ApiEndpointsDocumentation'
                                : 'obsOnboardingIngestHubV2ApiEndpointsDocumentation'
                            }
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
                    </div>
                  </EuiFlexItem>
                  {activeVersion === 'version1' ? (
                    <EuiFlexItem grow={false}>
                      <Version1ApiEndpointsHeaderCredentialSplit
                        dataTestSubj="obsOnboardingIngestHubV1ApiEndpointsHeaderCredential"
                        apiKeyManageHref={
                          services.http?.basePath.prepend('/app/management/security/api_keys') ??
                          '/app/management/security/api_keys'
                        }
                        enrollmentFleetHref={version1EnrollmentFleetHref}
                        createApiKeyForEndpointId={version1HeaderCredentialTargetEndpointId}
                        onApiKeyCreated={(result, endpointId) => {
                          const endpoint = API_ENDPOINTS.find((e) => e.id === endpointId);
                          if (
                            endpoint &&
                            (endpoint.keyType === 'api_key' || endpoint.keyType === 'kibana_note')
                          ) {
                            setVersion2ApiEndpointSecrets((prev) => ({
                              ...prev,
                              [endpointId]: result.encoded,
                            }));
                          }
                        }}
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                {activeVersion === 'version3' ? (
                  <Version3ApiEndpointsSplit
                    searchQuery={rawQ}
                    selectedEndpointId={version3ApiEndpointId}
                    onSelectEndpoint={setVersion3ApiEndpointId}
                    dataTestSubjPrefix="obsOnboardingIngestHubV3ApiEndpoint"
                    secretsByEndpointId={version3ApiEndpointSecrets}
                    apiKeyManageHref={
                      services.http?.basePath.prepend('/app/management/security/api_keys') ??
                      '/app/management/security/api_keys'
                    }
                    createApiKeyDataTestSubj="obsOnboardingIngestHubV3CreateApiKey"
                    onApiKeyCreated={(result, endpointId) => {
                      const endpoint = API_ENDPOINTS.find((e) => e.id === endpointId);
                      if (
                        endpoint &&
                        (endpoint.keyType === 'api_key' || endpoint.keyType === 'kibana_note')
                      ) {
                        setVersion3ApiEndpointSecrets((prev) => ({
                          ...prev,
                          [endpointId]: result.encoded,
                        }));
                      }
                    }}
                  />
                ) : (
                  <Version2ApiEndpointsSplit
                    searchQuery={rawQ}
                    selectedEndpointId={version2ApiEndpointId}
                    onSelectEndpoint={setVersion2ApiEndpointId}
                    dataTestSubjPrefix={
                      activeVersion === 'version1'
                        ? 'obsOnboardingIngestHubV1ApiEndpoint'
                        : 'obsOnboardingIngestHubV2ApiEndpoint'
                    }
                    secretsByEndpointId={version2ApiEndpointSecrets}
                    apiKeyManageHref={
                      services.http?.basePath.prepend('/app/management/security/api_keys') ??
                      '/app/management/security/api_keys'
                    }
                    createApiKeyDataTestSubj={
                      activeVersion === 'version1'
                        ? 'obsOnboardingIngestHubV1CreateApiKey'
                        : 'obsOnboardingIngestHubV2CreateApiKey'
                    }
                    unifiedHeaderCredentialActions={activeVersion === 'version1'}
                    onApiKeyCreated={(result, endpointId) => {
                      const endpoint = API_ENDPOINTS.find((e) => e.id === endpointId);
                      if (
                        endpoint &&
                        (endpoint.keyType === 'api_key' || endpoint.keyType === 'kibana_note')
                      ) {
                        setVersion2ApiEndpointSecrets((prev) => ({
                          ...prev,
                          [endpointId]: result.encoded,
                        }));
                      }
                    }}
                  />
                )}
              </EuiFlexGroup>
            ) : (
              <>
                <EuiTitle size="xs">
                  <h2>{catalogueTitle}</h2>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  <p>{catalogueDescription}</p>
                </EuiText>
                <EuiSpacer size="xxl" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {sorted.map((tile: TaggedTile) => (
                    <IntegrationCard
                      key={tile.id}
                      name={tile.name}
                      description={tile.description}
                      logoDomain={tile.logoDomain}
                      logoUrl={tile.logoUrl}
                      badge={tile.badge}
                      onClick={() => setFlyoutTile(tile)}
                    />
                  ))}
                </div>
                {sorted.length === 0 && <EuiText color="subdued">No results found.</EuiText>}
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  const renderGetStartedView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {renderSectionPageHeader(
        rocketImg,
        'Get started with Elastic Observability',
        'Your starting point to ingest data, create alerts, manage SLOs, explore Streams, and get the most out of your observability stack'
      )}
      <EuiHorizontalRule margin="none" />
      <div
        css={paddedContent}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <div style={{ height: 40 }} />
        <EuiAccordion
          id="step1-add-data"
          initialIsOpen={!hasAddedData}
          arrowDisplay="left"
          borders="none"
          buttonElement="div"
          buttonProps={{ paddingSize: 's' as const }}
          paddingSize="s"
          css={accordionCss}
          buttonContent={
            <EuiFlexGroup
              alignItems="center"
              gutterSize="none"
              responsive={false}
              wrap={false}
              css={css`
                gap: 16px;
              `}
            >
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: 8px;
                    `}
                  >
                    <span
                      css={css`
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background-color: ${euiTheme.colors.backgroundBaseSubdued};
                        flex-shrink: 0;
                      `}
                    >
                      <EuiIcon type="plusInCircle" size="m" />
                    </span>
                    Add your data
                  </h3>
                </EuiTitle>
                <EuiText
                  size="s"
                  color="subdued"
                  css={css`
                    margin-top: 4px;
                  `}
                >
                  <p>
                    Connect your data sources or migrate from another platform to start monitoring
                    your infrastructure.
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <div style={{ paddingTop: 16, paddingBottom: 16 }}>
            <EuiFlexGroup gutterSize="l" alignItems="flex-start">
              <EuiFlexItem>
                <EuiPanel
                  element="div"
                  hasBorder
                  paddingSize="none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      history.push(`${basePath}/integrations`);
                      setIntegrationsTab('all');
                      setSelectedCategory('all');
                    }
                  }}
                  css={css`
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    padding: 0 !important;
                    margin: 0;
                    border-radius: ${euiTheme.border.radius.medium};
                    box-shadow: ${euiTheme.shadows.s};
                    transition: box-shadow 0.15s ease-in;
                    &:hover {
                      box-shadow: ${euiTheme.shadows.m};
                    }
                  `}
                  onClick={() => {
                    history.push(`${basePath}/integrations`);
                    setIntegrationsTab('all');
                    setSelectedCategory('all');
                  }}
                >
                  <div
                    css={css`
                      flex: 0 0 auto;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-sizing: border-box;
                      min-height: 100px;
                      padding: 24px;
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                    `}
                  >
                    <img
                      src={integrationsHeaderImg}
                      alt=""
                      style={{ width: 52, height: 52, objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  <div
                    css={css`
                      flex: 0 0 auto;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: flex-start;
                      text-align: center;
                      background: ${euiTheme.colors.backgroundBasePlain};
                      padding: 24px;
                      box-sizing: border-box;
                    `}
                  >
                    <EuiTitle size="xs">
                      <h4
                        css={css`
                          text-align: center;
                          margin-block: 0;
                        `}
                      >
                        Recommended integrations
                      </h4>
                    </EuiTitle>
                    <EuiText
                      size="s"
                      color="subdued"
                      css={css`
                        margin-top: ${euiTheme.size.s};
                        text-align: center;
                        max-width: 100%;
                      `}
                    >
                      <p
                        css={css`
                          text-align: center;
                          margin-bottom: 0;
                        `}
                      >
                        Browse integrations for logs, metrics, and traces.
                      </p>
                    </EuiText>
                  </div>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel
                  element="div"
                  hasBorder
                  paddingSize="none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      history.push(`${basePath}/platform-migration`);
                    }
                  }}
                  css={css`
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    padding: 0 !important;
                    margin: 0;
                    border-radius: ${euiTheme.border.radius.medium};
                    box-shadow: ${euiTheme.shadows.s};
                    transition: box-shadow 0.15s ease-in;
                    &:hover {
                      box-shadow: ${euiTheme.shadows.m};
                    }
                  `}
                  onClick={() => {
                    history.push(`${basePath}/platform-migration`);
                  }}
                >
                  <div
                    css={css`
                      flex: 0 0 auto;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-sizing: border-box;
                      min-height: 100px;
                      padding: 24px;
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                      & img {
                        position: relative;
                        width: 40px;
                        height: 40px;
                        object-fit: contain;
                        flex-shrink: 0;
                        border-radius: 50%;
                        box-sizing: border-box;
                        background: ${euiTheme.colors.backgroundBasePlain};
                        padding: 4px;
                        box-shadow: 0 0 0 1px ${euiTheme.colors.borderBaseSubdued};
                      }
                      & img:not(:first-of-type) {
                        margin-inline-start: -12px;
                      }
                      & img:nth-of-type(1) {
                        z-index: 1;
                      }
                      & img:nth-of-type(2) {
                        z-index: 2;
                      }
                      & img:nth-of-type(3) {
                        z-index: 3;
                      }
                    `}
                  >
                    <img src={`${LOGO_FALLBACK}/datadoghq/datadoghq-icon.svg`} alt="Datadog" />
                    <img src={`${LOGO_FALLBACK}/newrelic/newrelic-icon.svg`} alt="New Relic" />
                    <img src={`${LOGO_FALLBACK}/grafana/grafana-icon.svg`} alt="Grafana" />
                  </div>
                  <div
                    css={css`
                      flex: 0 0 auto;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: flex-start;
                      text-align: center;
                      background: ${euiTheme.colors.backgroundBasePlain};
                      padding: 24px;
                      box-sizing: border-box;
                    `}
                  >
                    <EuiTitle size="xs">
                      <h4
                        css={css`
                          text-align: center;
                          margin-block: 0;
                        `}
                      >
                        Platform migration
                      </h4>
                    </EuiTitle>
                    <EuiText
                      size="s"
                      color="subdued"
                      css={css`
                        margin-top: ${euiTheme.size.s};
                        text-align: center;
                        max-width: 100%;
                      `}
                    >
                      <p
                        css={css`
                          text-align: center;
                          margin-bottom: 0;
                        `}
                      >
                        Migrate from Splunk, Datadog, or others.
                      </p>
                    </EuiText>
                  </div>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel
                  element="div"
                  hasBorder
                  paddingSize="none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveNavId('integrations');
                      setSelectedCategory('all-api-ingestion');
                      history.push(`${basePath}/integrations?category=api-ingestion`);
                    }
                  }}
                  css={css`
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    padding: 0 !important;
                    margin: 0;
                    border-radius: ${euiTheme.border.radius.medium};
                    box-shadow: ${euiTheme.shadows.s};
                    transition: box-shadow 0.15s ease-in;
                    &:hover {
                      box-shadow: ${euiTheme.shadows.m};
                    }
                  `}
                  onClick={() => {
                    setActiveNavId('integrations');
                    setSelectedCategory('all-api-ingestion');
                    history.push(`${basePath}/integrations?category=api-ingestion`);
                  }}
                >
                  <div
                    css={css`
                      flex: 0 0 auto;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-sizing: border-box;
                      min-height: 100px;
                      padding: 24px;
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                    `}
                  >
                    <img
                      src={apiEndpointHeaderImg}
                      alt=""
                      style={{ width: 52, height: 52, objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  <div
                    css={css`
                      flex: 0 0 auto;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: flex-start;
                      text-align: center;
                      background: ${euiTheme.colors.backgroundBasePlain};
                      padding: 24px;
                      box-sizing: border-box;
                    `}
                  >
                    <EuiTitle size="xs">
                      <h4
                        css={css`
                          text-align: center;
                          margin-block: 0;
                        `}
                      >
                        API connection
                      </h4>
                    </EuiTitle>
                    <EuiText
                      size="s"
                      color="subdued"
                      css={css`
                        margin-top: ${euiTheme.size.s};
                        text-align: center;
                        max-width: 100%;
                      `}
                    >
                      <p
                        css={css`
                          text-align: center;
                          margin-bottom: 0;
                        `}
                      >
                        Send data via REST API or OpenTelemetry.
                      </p>
                    </EuiText>
                  </div>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            <footer
              aria-label="Explore Observability without adding your own data"
              css={css`
                margin-top: ${euiTheme.size.xl};
                padding-top: ${euiTheme.size.m};
                padding-bottom: 0;
              `}
            >
              <EuiFlexGroup
                alignItems="center"
                gutterSize="xs"
                justifyContent="center"
                responsive
                wrap
              >
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={css`
                      text-align: center;
                    `}
                  >
                    <strong>Not ready to add your data?</strong> Explore a fully loaded sample
                    Observability environment before setting up.
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="observabilityOnboardingRenderGetStartedViewExploreDemoButton"
                    size="xs"
                    href="https://www.elastic.co/start"
                    target="_blank"
                    rel="noopener noreferrer"
                    iconType="popout"
                    iconSide="right"
                  >
                    Explore Demo
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </footer>
          </div>
        </EuiAccordion>

        <div style={{ height: 40 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <EuiAccordion
            id="step2-streams"
            arrowDisplay="left"
            borders="none"
            buttonElement="div"
            buttonProps={{ paddingSize: 's' as const }}
            paddingSize="s"
            css={accordionCss}
            buttonContent={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="none"
                responsive={false}
                wrap={false}
                css={css`
                  gap: 16px;
                `}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: 8px;
                      `}
                    >
                      <span
                        css={css`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: 32px;
                          height: 32px;
                          border-radius: 50%;
                          background-color: ${euiTheme.colors.backgroundBaseSubdued};
                          flex-shrink: 0;
                        `}
                      >
                        <EuiIcon type="devToolsApp" size="m" />
                      </span>
                      Turn raw data into structured with Streams
                    </h3>
                  </EuiTitle>
                  <EuiText
                    size="s"
                    color="subdued"
                    css={css`
                      margin-top: 4px;
                    `}
                  >
                    <p>
                      Use Streams to route, transform, and organize your incoming data into
                      structured formats for easier querying and analysis.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={hasAddedData ? 'success' : 'warning'}>
                    {hasAddedData ? 'Available' : 'Requires data'}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiEmptyPrompt
              color="dark"
              layout="horizontal"
              css={css`
                border-radius: 8px;
              `}
              body={
                <EuiText size="s">
                  <p>
                    Streams provides a centralized UI that streamlines common tasks like rerouting
                    data, extracting fields, or setting data retention, so you don&apos;t need to
                    navigate to multiple applications or manually configure underlying Elasticsearch
                    components.
                  </p>
                </EuiText>
              }
              actions={[
                <EuiToolTip content="Ingest data first to unlock Streams" key="streams-btn">
                  <EuiButton
                    data-test-subj="observabilityOnboardingRenderGetStartedViewOpenStreamsButton"
                    disabled
                  >
                    Open Streams
                  </EuiButton>
                </EuiToolTip>,
              ]}
              icon={
                <div
                  css={css`
                    width: 100%;
                    min-height: 180px;
                    border-radius: 6px;
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type="image" size="xxl" color="subdued" />
                </div>
              }
            />
          </EuiAccordion>

          <EuiAccordion
            id="step-discover"
            arrowDisplay="left"
            borders="none"
            buttonElement="div"
            buttonProps={{ paddingSize: 's' as const }}
            paddingSize="s"
            css={accordionCss}
            buttonContent={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="none"
                responsive={false}
                wrap={false}
                css={css`
                  gap: 16px;
                `}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: 8px;
                      `}
                    >
                      <span
                        css={css`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: 32px;
                          height: 32px;
                          border-radius: 50%;
                          background-color: ${euiTheme.colors.backgroundBaseSubdued};
                          flex-shrink: 0;
                        `}
                      >
                        <EuiIcon type="discoverApp" size="m" />
                      </span>
                      Explore your data with Discover
                    </h3>
                  </EuiTitle>
                  <EuiText
                    size="s"
                    color="subdued"
                    css={css`
                      margin-top: 4px;
                    `}
                  >
                    <p>
                      Search, filter, and visualize your ingested data to uncover patterns and
                      insights.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={hasAddedData ? 'success' : 'warning'}>
                    {hasAddedData ? 'Available' : 'Requires data'}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiEmptyPrompt
              color="dark"
              layout="horizontal"
              css={css`
                border-radius: 8px;
              `}
              body={
                <EuiText size="s">
                  <p>
                    Discover lets you interactively explore your data with full-text search and
                    filtering. Drill into individual log entries, correlate events across sources,
                    and build saved searches to share with your team.
                  </p>
                </EuiText>
              }
              actions={[
                hasAddedData ? (
                  <EuiButton
                    data-test-subj="observabilityOnboardingRenderGetStartedViewOpenDiscoverButton"
                    key="discover-btn"
                    fill
                    onClick={() => services.application?.navigateToApp('discover')}
                  >
                    Open Discover
                  </EuiButton>
                ) : (
                  <EuiToolTip content="Ingest data first to unlock Discover" key="discover-btn">
                    <EuiButton
                      data-test-subj="observabilityOnboardingRenderGetStartedViewOpenDiscoverButton"
                      disabled
                    >
                      Open Discover
                    </EuiButton>
                  </EuiToolTip>
                ),
              ]}
              icon={
                <div
                  css={css`
                    width: 100%;
                    min-height: 180px;
                    border-radius: 6px;
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type="image" size="xxl" color="subdued" />
                </div>
              }
            />
          </EuiAccordion>

          <EuiAccordion
            id="step3-dashboards"
            arrowDisplay="left"
            borders="none"
            buttonElement="div"
            buttonProps={{ paddingSize: 's' as const }}
            paddingSize="s"
            css={accordionCss}
            buttonContent={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="none"
                responsive={false}
                wrap={false}
                css={css`
                  gap: 16px;
                `}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: 8px;
                      `}
                    >
                      <span
                        css={css`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: 32px;
                          height: 32px;
                          border-radius: 50%;
                          background-color: ${euiTheme.colors.backgroundBaseSubdued};
                          flex-shrink: 0;
                        `}
                      >
                        <EuiIcon type="dashboardApp" size="m" />
                      </span>
                      Analyze your data using Dashboards
                    </h3>
                  </EuiTitle>
                  <EuiText
                    size="s"
                    color="subdued"
                    css={css`
                      margin-top: 4px;
                    `}
                  >
                    <p>
                      Create and customize dashboards to visualize your data, track key metrics, and
                      gain insights across your infrastructure and applications.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={hasAddedData ? 'success' : 'warning'}>
                    {hasAddedData ? 'Available' : 'Requires data'}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiEmptyPrompt
              color="dark"
              layout="horizontal"
              css={css`
                border-radius: 8px;
              `}
              body={
                <EuiText size="s">
                  <p>
                    Dashboards provide a powerful way to visualize and explore your observability
                    data in real time. Create custom views, track key metrics, and gain insights
                    across your infrastructure and applications.
                  </p>
                </EuiText>
              }
              actions={[
                <EuiToolTip content="Ingest data first to unlock Dashboards" key="dashboards-btn">
                  <EuiButton
                    data-test-subj="observabilityOnboardingRenderGetStartedViewOpenDashboardsButton"
                    disabled
                  >
                    Open Dashboards
                  </EuiButton>
                </EuiToolTip>,
              ]}
              icon={
                <div
                  css={css`
                    width: 100%;
                    min-height: 180px;
                    border-radius: 6px;
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type="image" size="xxl" color="subdued" />
                </div>
              }
            />
          </EuiAccordion>

          <EuiAccordion
            id="step4-alerts"
            arrowDisplay="left"
            borders="none"
            buttonElement="div"
            buttonProps={{ paddingSize: 's' as const }}
            paddingSize="s"
            css={accordionCss}
            buttonContent={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="none"
                responsive={false}
                wrap={false}
                css={css`
                  gap: 16px;
                `}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: 8px;
                      `}
                    >
                      <span
                        css={css`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: 32px;
                          height: 32px;
                          border-radius: 50%;
                          background-color: ${euiTheme.colors.backgroundBaseSubdued};
                          flex-shrink: 0;
                        `}
                      >
                        <EuiIcon type="watchesApp" size="m" />
                      </span>
                      Get notified when issues occur with Alerts
                    </h3>
                  </EuiTitle>
                  <EuiText
                    size="s"
                    color="subdued"
                    css={css`
                      margin-top: 4px;
                    `}
                  >
                    <p>
                      Set up alerting rules to get notified when metrics cross thresholds, services
                      go down, or anomalies are detected.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={hasAddedData ? 'success' : 'warning'}>
                    {hasAddedData ? 'Available' : 'Requires data'}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiEmptyPrompt
              color="dark"
              layout="horizontal"
              css={css`
                border-radius: 8px;
              `}
              body={
                <EuiText size="s">
                  <p>
                    Configure alerting rules and notification channels to stay informed about issues
                    in your infrastructure. Get notified when metrics cross thresholds, services go
                    down, or anomalies are detected.
                  </p>
                </EuiText>
              }
              actions={[
                <EuiToolTip content="Ingest data first to unlock Alerts" key="alerts-btn">
                  <EuiButton
                    data-test-subj="observabilityOnboardingRenderGetStartedViewOpenAlertsButton"
                    disabled
                  >
                    Open Alerts
                  </EuiButton>
                </EuiToolTip>,
              ]}
              icon={
                <div
                  css={css`
                    width: 100%;
                    min-height: 180px;
                    border-radius: 6px;
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type="image" size="xxl" color="subdued" />
                </div>
              }
            />
          </EuiAccordion>

          <EuiAccordion
            id="step5-slos"
            arrowDisplay="left"
            borders="none"
            buttonElement="div"
            buttonProps={{ paddingSize: 's' as const }}
            paddingSize="s"
            css={accordionCss}
            buttonContent={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="none"
                responsive={false}
                wrap={false}
                css={css`
                  gap: 16px;
                `}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: 8px;
                      `}
                    >
                      <span
                        css={css`
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: 32px;
                          height: 32px;
                          border-radius: 50%;
                          background-color: ${euiTheme.colors.backgroundBaseSubdued};
                          flex-shrink: 0;
                        `}
                      >
                        <EuiIcon type="uptimeApp" size="m" />
                      </span>
                      Spot and troubleshoot issues early with SLOs
                    </h3>
                  </EuiTitle>
                  <EuiText
                    size="s"
                    color="subdued"
                    css={css`
                      margin-top: 4px;
                    `}
                  >
                    <p>
                      Define Service Level Objectives to track reliability, measure error budgets,
                      and catch degradations before they impact users.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={hasAddedData ? 'success' : 'warning'}>
                    {hasAddedData ? 'Available' : 'Requires data'}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiEmptyPrompt
              color="dark"
              layout="horizontal"
              css={css`
                border-radius: 8px;
              `}
              body={
                <EuiText size="s">
                  <p>
                    SLOs help you set measurable targets for service reliability and track your
                    error budget over time. Define Service Level Objectives to catch degradations
                    before they impact users.
                  </p>
                </EuiText>
              }
              actions={[
                <EuiToolTip content="Ingest data first to unlock SLOs" key="slos-btn">
                  <EuiButton
                    data-test-subj="observabilityOnboardingRenderGetStartedViewOpenSlOsButton"
                    disabled
                  >
                    Open SLOs
                  </EuiButton>
                </EuiToolTip>,
              ]}
              icon={
                <div
                  css={css`
                    width: 100%;
                    min-height: 180px;
                    border-radius: 6px;
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type="image" size="xxl" color="subdued" />
                </div>
              }
            />
          </EuiAccordion>
        </div>

        <EuiFlexGroup
          gutterSize="m"
          style={{ marginTop: 'auto', paddingTop: 80, marginBottom: 64 }}
        >
          <EuiFlexItem>
            <EuiPanel
              data-test-subj="observabilityOnboardingGetStartedObservabilityForumCard"
              hasBorder
              paddingSize="m"
              css={css`
                border-radius: 8px;
                text-align: center;
              `}
            >
              <EuiTitle size="xxs">
                <h4>Observability Forum</h4>
              </EuiTitle>
              <EuiText
                size="s"
                color="subdued"
                css={css`
                  margin-bottom: 4px;
                `}
              >
                Exchange thoughts about Elastic.
              </EuiText>
              <EuiText size="xs">
                <EuiLink
                  data-test-subj="observabilityOnboardingRenderGetStartedViewDiscussInForumLink"
                  href="https://discuss.elastic.co"
                  target="_blank"
                  external
                >
                  Discuss in Forum
                </EuiLink>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel
              data-test-subj="observabilityOnboardingGetStartedDocumentationCard"
              hasBorder
              paddingSize="m"
              css={css`
                border-radius: 8px;
                text-align: center;
              `}
            >
              <EuiTitle size="xxs">
                <h4>Documentation</h4>
              </EuiTitle>
              <EuiText
                size="s"
                color="subdued"
                css={css`
                  margin-bottom: 4px;
                `}
              >
                In-depth guides and reference content.
              </EuiText>
              <EuiText size="xs">
                <EuiLink
                  data-test-subj="observabilityOnboardingRenderGetStartedViewLearnMoreLink"
                  href="https://www.elastic.co/docs/solutions/observability"
                  target="_blank"
                  external
                >
                  Learn more
                </EuiLink>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel
              data-test-subj="observabilityOnboardingGetStartedSupportHubCard"
              hasBorder
              paddingSize="m"
              css={css`
                border-radius: 8px;
                text-align: center;
              `}
            >
              <EuiTitle size="xxs">
                <h4>Support Hub</h4>
              </EuiTitle>
              <EuiText
                size="s"
                color="subdued"
                css={css`
                  margin-bottom: 4px;
                `}
              >
                Get help by opening a case.
              </EuiText>
              <EuiText size="xs">
                <EuiLink
                  data-test-subj="observabilityOnboardingRenderGetStartedViewOpenSupportHubLink"
                  href="https://support.elastic.co"
                  target="_blank"
                  external
                >
                  Open Support Hub
                </EuiLink>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );

  const renderMigrationPlaceholder = (
    imageSrc: string,
    heading: string,
    subtitle: string,
    placeholder: string
  ) => (
    <>
      {renderSectionPageHeader(imageSrc, heading, subtitle)}
      <EuiHorizontalRule margin="none" />
      <div css={paddedContent} style={{ width: '100%' }}>
        <div style={{ height: 40 }} />
        <EuiText color="subdued">{placeholder}</EuiText>
      </div>
    </>
  );

  const renderPlatformMigrationView = () => (
    <>
      {renderSectionPageHeader(
        platformMigrationHeaderImg,
        'Platform Migration',
        'Migrate dashboards, rules, and data pipelines from other observability platforms into Elastic'
      )}
      <EuiHorizontalRule margin="none" />
      <div css={paddedContent} style={{ width: '100%' }}>
        <div style={{ height: 40 }} />
        {renderPlatformMigrationContent()}
      </div>
    </>
  );

  const STREAMS_WELCOME_BANNER_DISMISSED_KEY =
    'observabilityOnboarding.ingestHub.streamsWelcomeBannerDismissed';
  const [streamsWelcomeBannerDismissed, setStreamsWelcomeBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem(STREAMS_WELCOME_BANNER_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const dismissStreamsWelcomeBanner = () => {
    setStreamsWelcomeBannerDismissed(true);
    try {
      localStorage.setItem(STREAMS_WELCOME_BANNER_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const renderStreamsView = () => {
    const streamsFeedbackUrl = (() => {
      const base = 'https://ela.st/feedback-streams-ui';
      const params = new URLSearchParams({
        path: window.location.pathname,
        ...(services.context?.isServerless
          ? { environment: 'Serverless' }
          : services.context?.isCloud
          ? { environment: 'Cloud' }
          : { environment: 'Self-Managed' }),
      });
      return `${base}?${params.toString()}`;
    })();
    const isStreamsFeedbackEnabled = services.notifications?.feedback?.isEnabled() ?? true;

    return (
      <>
        <div css={paddedContent} style={{ width: '100%' }}>
          <div style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                paddingTop: 40,
                paddingBottom: 40,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                <div
                  style={{
                    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                    borderRadius: 12,
                    padding: 4,
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={rulesHeaderImg}
                    alt={i18n.translate(
                      'xpack.observabilityOnboarding.ingestHub.streams.pageTitle',
                      {
                        defaultMessage: 'Streams',
                      }
                    )}
                    style={{ width: 64, height: 64, objectFit: 'contain', display: 'block' }}
                  />
                </div>
                <div>
                  <EuiTitle size="l">
                    <h2>
                      {i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.pageTitle', {
                        defaultMessage: 'Streams',
                      })}
                    </h2>
                  </EuiTitle>
                  <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
                    {i18n.translate(
                      'xpack.observabilityOnboarding.ingestHub.streams.pageSubtitle',
                      {
                        defaultMessage:
                          'Manage your Elasticsearch data streams in one place. View data quality, retention, and stream details.',
                      }
                    )}
                  </EuiText>
                </div>
              </div>
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                responsive={false}
                wrap={false}
                justifyContent="flexEnd"
                css={css({ marginLeft: 'auto' })}
              >
                {isStreamsFeedbackEnabled && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="observabilityOnboardingRenderStreamsViewGiveFeedbackButton"
                      size="s"
                      iconType="popout"
                      href={streamsFeedbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      iconSide="right"
                      aria-label={i18n.translate(
                        'xpack.observabilityOnboarding.ingestHub.streams.giveFeedbackLabel',
                        { defaultMessage: 'Give feedback' }
                      )}
                    >
                      {i18n.translate(
                        'xpack.observabilityOnboarding.ingestHub.streams.giveFeedbackLabel',
                        { defaultMessage: 'Give feedback' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="observabilityOnboardingRenderStreamsViewSettingsButton"
                    size="s"
                    iconType="gear"
                    onClick={() => services.application.navigateToApp?.('streams')}
                    aria-label={i18n.translate(
                      'xpack.observabilityOnboarding.ingestHub.streams.settingsLabel',
                      { defaultMessage: 'Settings' }
                    )}
                  >
                    {i18n.translate(
                      'xpack.observabilityOnboarding.ingestHub.streams.settingsLabel',
                      { defaultMessage: 'Settings' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="observabilityOnboardingRenderStreamsViewCreateClassicStreamButton"
                    size="s"
                    fill
                    onClick={() => services.application.navigateToApp?.('streams')}
                  >
                    {i18n.translate(
                      'xpack.observabilityOnboarding.ingestHub.streams.createClassicStreamLabel',
                      { defaultMessage: 'Create classic stream' }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </div>
        </div>
        <EuiHorizontalRule margin="none" css={dividerStyle} />
        <div
          css={css`
            width: 100%;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            padding-left: ${euiTheme.size.l};
            padding-right: ${euiTheme.size.l};
          `}
        >
          <div style={{ height: 40 }} />
          <div
            ref={(el) => {
              streamsEmptyPromptRef.current = el;
              setStreamsEmptyPromptEl(el);
            }}
          />
          {!streamsWelcomeBannerDismissed && (
            <>
              <EuiPanel hasBorder paddingSize="m" color="subdued" grow={false} borderRadius="m">
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <StreamsWelcomeBannerImage size={140} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
                      <EuiFlexItem
                        css={css`
                          flex-grow: 0 !important;
                          margin-bottom: 4px;
                        `}
                      >
                        <EuiTitle size="xs">
                          <h4>
                            {i18n.translate('xpack.streams.welcomeCallout.title', {
                              defaultMessage:
                                'Welcome to Streams, our next-generation model to manage your data in a single place',
                            })}
                          </h4>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s" color="subdued">
                          {i18n.translate('xpack.streams.welcomeCallout.description', {
                            defaultMessage:
                              'Your existing Elasticsearch data streams appear here as classic streams, simplifying field extraction and retention management.',
                          })}
                          <br />
                          {i18n.translate('xpack.streams.welcomeCallout.descriptionSecondLine', {
                            defaultMessage:
                              'To try the full managed hierarchy experience, enable /logs streams when onboarding new data.',
                          })}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiSpacer size="m" />
                      <EuiFlexItem>
                        <EuiFlexGroup
                          direction="row"
                          gutterSize="s"
                          responsive={false}
                          alignItems="center"
                          justifyContent="flexEnd"
                        >
                          {(services.notifications?.tours?.isEnabled() ?? true) && (
                            <EuiFlexItem grow={false}>
                              <EuiButton
                                data-test-subj="observabilityOnboardingRenderStreamsViewStartTourButton"
                                color="primary"
                                size="s"
                                onClick={() => services.application.navigateToApp?.('streams')}
                              >
                                {i18n.translate('xpack.streams.welcomeCallout.startTourButton', {
                                  defaultMessage: 'Start tour',
                                })}
                              </EuiButton>
                            </EuiFlexItem>
                          )}
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              data-test-subj="observabilityOnboardingRenderStreamsViewViewDocsButton"
                              color="primary"
                              size="s"
                              href={services.docLinks?.links?.observability?.logsStreams}
                              target="_blank"
                              rel="noopener"
                              iconType="popout"
                              iconSide="right"
                            >
                              {i18n.translate('xpack.streams.welcomeCallout.docsButton', {
                                defaultMessage: 'View docs',
                              })}
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiLink
                              data-test-subj="observabilityOnboardingRenderStreamsViewDontShowThisAgainLink"
                              onClick={dismissStreamsWelcomeBanner}
                              aria-label={i18n.translate(
                                'xpack.streams.welcomeCallout.dismissAriaLabel',
                                { defaultMessage: 'Dismiss welcome callout' }
                              )}
                            >
                              {i18n.translate('xpack.streams.welcomeCallout.dismissButton', {
                                defaultMessage: "Don't show this again",
                              })}
                            </EuiLink>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="l" />
            </>
          )}
          <div
            css={css`
              width: 100%;
              flex: 1;
              min-height: 400px;
              display: flex;
              flex-direction: column;
            `}
          >
            <StreamsReplicatedTable />
          </div>
        </div>
      </>
    );
  };

  const seedAwsLogsAndNavigateToDiscover = async () => {
    setWelcomeChildTile(null);

    const now = Date.now();
    const sources = [
      {
        index: 'logs-aws.cloudtrail-default',
        dataset: 'aws.cloudtrail',
        messages: [
          {
            level: 'info',
            msg: 'AssumeRole performed by user:admin from IP 10.0.1.54',
            action: 'AssumeRole',
          },
          {
            level: 'info',
            msg: 'ConsoleLogin for user:dev-engineer from 192.168.1.100',
            action: 'ConsoleLogin',
          },
          {
            level: 'info',
            msg: 'CreateBucket action on resource arn:aws:s3:::app-logs-backup',
            action: 'CreateBucket',
          },
          {
            level: 'info',
            msg: 'PutObject to s3://production-data/configs/app.yaml',
            action: 'PutObject',
          },
          {
            level: 'info',
            msg: 'DescribeInstances called by role:ECSServiceRole',
            action: 'DescribeInstances',
          },
          {
            level: 'warning',
            msg: 'AuthorizeSecurityGroupIngress on sg-0a1b2c3d4e5f from 0.0.0.0/0',
            action: 'AuthorizeSecurityGroupIngress',
          },
          {
            level: 'info',
            msg: 'DeleteObject from s3://temp-uploads/batch-7291.tmp',
            action: 'DeleteObject',
          },
          {
            level: 'info',
            msg: 'RunInstances launched i-0abc123def456 (t3.medium)',
            action: 'RunInstances',
          },
        ],
      },
      {
        index: 'logs-aws.vpcflow-default',
        dataset: 'aws.vpcflow',
        messages: [
          {
            level: 'info',
            msg: '10.0.3.45 → 10.0.5.22:443 ACCEPT 12 packets 4892 bytes',
            action: 'ACCEPT',
          },
          {
            level: 'error',
            msg: '10.0.1.17 → 172.16.0.5:22 REJECT 3 packets 180 bytes',
            action: 'REJECT',
          },
          {
            level: 'info',
            msg: '10.0.2.88 → 10.0.4.100:5432 ACCEPT 45 packets 32400 bytes',
            action: 'ACCEPT',
          },
          {
            level: 'info',
            msg: '192.168.1.50 → 10.0.3.10:80 ACCEPT 8 packets 2048 bytes',
            action: 'ACCEPT',
          },
          {
            level: 'error',
            msg: '10.0.5.12 → 10.0.1.4:3389 REJECT 7 packets 420 bytes',
            action: 'REJECT',
          },
          {
            level: 'info',
            msg: '10.0.4.100 → 10.0.6.15:8443 ACCEPT 34 packets 22100 bytes',
            action: 'ACCEPT',
          },
        ],
      },
      {
        index: 'logs-aws.cloudwatch_logs-default',
        dataset: 'aws.cloudwatch_logs',
        messages: [
          {
            level: 'info',
            msg: '[INFO] Lambda function app-processor invoked successfully in 245ms',
            action: 'LambdaInvoke',
          },
          {
            level: 'error',
            msg: '[ERROR] Connection timeout to RDS instance db-prod-01 after 30s',
            action: 'RDSTimeout',
          },
          {
            level: 'warning',
            msg: '[WARN] Memory utilization at 87% for ECS task web-service/abc123',
            action: 'ECSMemory',
          },
          {
            level: 'info',
            msg: '[INFO] API Gateway request 200 OK — GET /api/v1/users — 12ms',
            action: 'APIGateway',
          },
          {
            level: 'info',
            msg: '[DEBUG] DynamoDB query consumed 5.0 RCU on table user-sessions',
            action: 'DynamoDBQuery',
          },
          {
            level: 'error',
            msg: '[ERROR] ECS container health check failed for task web-service/def456',
            action: 'ECSHealthCheck',
          },
        ],
      },
      {
        index: 'logs-aws.s3access-default',
        dataset: 'aws.s3access',
        messages: [
          {
            level: 'info',
            msg: 'REST.GET.OBJECT production-data/reports/2026-03-09.csv — 200 — 14ms',
            action: 'GET',
          },
          {
            level: 'info',
            msg: 'REST.PUT.OBJECT app-logs-backup/2026/03/09/ct-log.gz — 200 — 8ms',
            action: 'PUT',
          },
          {
            level: 'info',
            msg: 'REST.GET.BUCKET production-data — 200 — prefix=configs/',
            action: 'GET',
          },
          {
            level: 'info',
            msg: 'REST.HEAD.OBJECT static-assets/images/logo.png — 200 — 3ms',
            action: 'HEAD',
          },
          {
            level: 'info',
            msg: 'REST.DELETE.OBJECT temp-uploads/batch-7291.tmp — 204 — 5ms',
            action: 'DELETE',
          },
        ],
      },
      {
        index: 'logs-aws.guardduty-default',
        dataset: 'aws.guardduty',
        messages: [
          {
            level: 'error',
            msg: 'UnauthorizedAccess:EC2/SSHBruteForce on i-0abc123def456 — severity: HIGH',
            action: 'SSHBruteForce',
          },
          {
            level: 'warning',
            msg: 'Recon:EC2/PortProbeUnprotectedPort on i-0def456abc789 — severity: MEDIUM',
            action: 'PortProbe',
          },
          {
            level: 'error',
            msg: 'CryptoCurrency:EC2/BitcoinTool.B on i-0789abc123def — severity: HIGH',
            action: 'BitcoinTool',
          },
          {
            level: 'warning',
            msg: 'UnauthorizedAccess:IAMUser/MaliciousIPCaller on user:test-account — severity: LOW',
            action: 'MaliciousIP',
          },
          {
            level: 'error',
            msg: 'Trojan:EC2/DNSDataExfiltration on i-0abc999def111 — severity: HIGH',
            action: 'DNSExfiltration',
          },
        ],
      },
      {
        index: 'logs-aws.elb_logs-default',
        dataset: 'aws.elb_logs',
        messages: [
          {
            level: 'info',
            msg: 'https 200 app/web-alb/abc123 10.0.1.50:443 "GET /api/health HTTP/2" 0.015s',
            action: 'GET',
          },
          {
            level: 'info',
            msg: 'https 200 app/web-alb/abc123 10.0.2.31:443 "POST /api/v1/events HTTP/2" 0.008s',
            action: 'POST',
          },
          {
            level: 'error',
            msg: 'https 502 app/web-alb/abc123 10.0.3.72:443 "GET /api/v1/dashboard HTTP/2" 0.030s',
            action: 'GET',
          },
          {
            level: 'info',
            msg: 'https 200 app/web-alb/abc123 10.0.4.18:443 "GET /static/app.js HTTP/2" 0.003s',
            action: 'GET',
          },
          {
            level: 'warning',
            msg: 'https 429 app/web-alb/abc123 10.0.5.91:443 "POST /api/v1/ingest HTTP/2" 0.045s',
            action: 'POST',
          },
        ],
      },
    ];

    let bulkBody = '';
    let docIdx = 0;
    for (const src of sources) {
      for (let round = 0; round < 3; round++) {
        for (const m of src.messages) {
          const ts = new Date(now - docIdx * 1800 - Math.floor(Math.random() * 500)).toISOString();
          bulkBody += JSON.stringify({ index: { _index: src.index } }) + '\n';
          bulkBody +=
            JSON.stringify({
              '@timestamp': ts,
              message: m.msg,
              log: { level: m.level },
              data_stream: { dataset: src.dataset, namespace: 'default', type: 'logs' },
              cloud: { provider: 'aws', region: 'us-west-2', account: { id: '123456789012' } },
              event: { action: m.action, dataset: src.dataset },
            }) + '\n';
          docIdx++;
        }
      }
    }

    const httpBasePath = services.http?.basePath.get() ?? '';

    try {
      const resp = await fetch(
        `${httpBasePath}/api/console/proxy?path=${encodeURIComponent('/_bulk')}&method=POST`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'reporting',
          },
          body: bulkBody,
        }
      );
      if (!resp.ok) {
        throw new Error(`Bulk failed: ${resp.status}`);
      }
    } catch (_) {
      try {
        for (const src of sources) {
          for (const m of src.messages) {
            const ts = new Date(now - Math.floor(Math.random() * 300000)).toISOString();
            await services.http?.post(`/api/console/proxy`, {
              query: { path: `/${src.index}/_doc`, method: 'POST' },
              body: JSON.stringify({
                '@timestamp': ts,
                message: m.msg,
                log: { level: m.level },
                data_stream: { dataset: src.dataset, namespace: 'default', type: 'logs' },
                cloud: { provider: 'aws', region: 'us-west-2', account: { id: '123456789012' } },
                event: { action: m.action, dataset: src.dataset },
              }),
            });
          }
        }
      } catch {
        /* last resort: proceed without data */
      }
    }

    let dataViewId = '';
    try {
      const existing = await services.http?.get('/api/data_views');
      const dvList =
        (existing as { data_view?: Array<{ id: string; title: string; name?: string }> })
          ?.data_view ?? [];
      const allLogs = dvList.find(
        (dv) =>
          dv.name?.toLowerCase() === 'all logs' || dv.title === 'logs-*' || dv.title === 'logs-*-*'
      );
      dataViewId = allLogs?.id ?? '';
    } catch {
      /* ignore */
    }

    setLeavingForDiscover(true);

    await new Promise((resolve) => requestAnimationFrame(resolve));

    document.getElementById('blockUxOverrideStyles')?.remove();
    const appEl = document.querySelector('.kbnChromeLayoutApplication');
    const gridRoot = appEl?.parentElement;
    if (gridRoot) {
      gridRoot.style.removeProperty('grid-template-columns');
      gridRoot.style.removeProperty('background');
    }
    if (appEl) {
      (appEl as HTMLElement).style.removeProperty('margin-left');
      (appEl as HTMLElement).style.removeProperty('margin-right');
      (appEl as HTMLElement).style.removeProperty('width');
    }

    sessionStorage.setItem('ingestHub:showDiscoverTour', 'true');
    sessionStorage.setItem('ingestHub:dataAdded', 'true');
    window.dispatchEvent(new Event('ingestHub:startDiscoverTour'));

    // Always open Discover in KQL/data-view mode so tour anchors (field list,
    // data view picker) are present. Falling back to a generic kuery path
    // avoids the ES|QL view where those elements don't exist.
    const discoverPath = dataViewId
      ? `#/?_a=(dataSource:(dataViewId:'${dataViewId}',type:dataView),query:(language:kuery,query:''))`
      : `#/?_a=(query:(language:kuery,query:''))`;
    services.application?.navigateToApp('discover', { path: discoverPath });
  };

  const renderBlockUxPage = () => (
    <>
      <style id="blockUxOverrideStyles">{`
      .kbnChromeLayoutNavigation,
      .kbnChromeLayoutSidebar {
        display: none !important;
      }
      body {
        background-color: #fff !important;
      }
      .euiOverlayMask {
        left: 24px !important;
        right: 24px !important;
        border-radius: 6px !important;
      }
      div[data-euiportal]:has(.euiFlyout) {
        position: fixed !important;
        top: 0 !important;
        left: 24px !important;
        right: 24px !important;
        bottom: 0 !important;
        contain: paint !important;
        pointer-events: none !important;
        z-index: 1001 !important;
      }
      div[data-euiportal]:has(.euiFlyout) .euiFlyout {
        right: 0 !important;
        inset-inline-end: 0 !important;
        pointer-events: auto !important;
      }
    `}</style>
      <div
        css={css`
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${euiTheme.colors.backgroundBasePlain};
          display: flex;
          flex-direction: column;
          min-height: 100%;
        `}
      >
        <div
          css={css`
            flex: 1;
            overflow-y: auto;
          `}
        >
          <div css={paddedContent} style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 16,
                paddingTop: 40,
                paddingBottom: 40,
              }}
            >
              <EuiIcon type="logoObservability" size="xxl" />
              <div>
                <EuiTitle size="l">
                  <h2>Welcome to Elastic Observability</h2>
                </EuiTitle>
                <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
                  Your starting point to ingest data, create alerts, manage SLOs, explore Streams,
                  and get the most out of your observability stack
                </EuiText>
              </div>
            </div>
          </div>
          <EuiHorizontalRule margin="none" css={dividerStyle} />
          <div css={paddedContent} style={{ width: '100%' }}>
            <div style={{ height: 32 }} />
            <div
              css={css`
                margin-bottom: 48px;
              `}
            >
              <EuiTitle size="s">
                <h3>Add your data</h3>
              </EuiTitle>
              <EuiText
                size="s"
                color="subdued"
                css={css`
                  margin-top: 4px;
                `}
              >
                <p>Connect your data sources to start monitoring your infrastructure.</p>
              </EuiText>
            </div>
            {SECTIONS.map((section, idx) => (
              <React.Fragment key={section.title}>
                {idx > 0 && <div style={{ height: 40 }} />}
                <EuiTitle size="xs">
                  <h3>{section.title}</h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>{section.description}.</p>
                </EuiText>
                <EuiSpacer size="xl" />
                {renderCompactGrid(section.tiles, undefined, undefined, setWelcomeChildTile)}
              </React.Fragment>
            ))}
            {SAAS_TILES.length > 0 && (
              <>
                <div style={{ height: 40 }} />
                <EuiTitle size="xs">
                  <h3>SaaS Products</h3>
                </EuiTitle>
                <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
                  <p>Monitor your cloud resources without installing an agent.</p>
                </EuiText>
                <EuiSpacer size="xl" />
                {renderCompactGrid(SAAS_TILES, undefined, undefined, setWelcomeChildTile)}
              </>
            )}
            <div style={{ height: 64 }} />
          </div>
        </div>

        {welcomeChildTile && welcomeChildTile.id === 'kubernetes' && (
          <KubernetesFlyout
            logoUrl={welcomeChildTile.logoUrl ?? ''}
            onClose={() => setWelcomeChildTile(null)}
          />
        )}

        {welcomeChildTile && welcomeChildTile.id === 'aws' && (
          <AwsFlyout
            logoUrl={welcomeChildTile.logoUrl ?? ''}
            onClose={() => setWelcomeChildTile(null)}
            onSeeMyData={() => seedAwsLogsAndNavigateToDiscover()}
          />
        )}

        {welcomeChildTile &&
          welcomeChildTile.id !== 'kubernetes' &&
          welcomeChildTile.id !== 'aws' && (
            <EuiFlyout
              ownFocus
              onClose={() => setWelcomeChildTile(null)}
              aria-labelledby="blockUxChildFlyoutTitle"
              css={css`
                inline-size: 72vw !important;
                & .euiFlyoutHeader {
                  padding-block: 32px !important;
                  padding-inline: 32px !important;
                }
                & .euiFlyoutBody__overflowContent {
                  padding-block: 32px !important;
                  padding-inline: 32px !important;
                }
                & .euiFlyoutFooter {
                  padding-block: 16px !important;
                  padding-inline: 32px !important;
                }
              `}
            >
              <EuiFlyoutHeader hasBorder>
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <CardLogoIcon
                      src={welcomeChildTile.logoUrl ?? ''}
                      alt={`${welcomeChildTile.name} logo`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="m">
                      <h2 id="blockUxChildFlyoutTitle">{welcomeChildTile.name}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                {welcomeChildTile.description ? (
                  <EuiText>
                    <p>{welcomeChildTile.description}</p>
                  </EuiText>
                ) : (
                  <EuiText color="subdued">
                    <p>No additional details available for this integration.</p>
                  </EuiText>
                )}
              </EuiFlyoutBody>
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton data-test-subj="observabilityOnboardingRenderBlockUxPageButton" fill>
                      Add {welcomeChildTile.name}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            </EuiFlyout>
          )}

        {/* Version switcher is rendered globally via plugin.tsx navControls */}
      </div>
    </>
  );

  if (isStopFillVersion) {
    if (leavingForDiscover) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <EuiLoadingElastic size="xxl" />
          <EuiText color="subdued" size="s">
            <p>Loading your data&hellip;</p>
          </EuiText>
        </div>
      );
    }
    return renderBlockUxPage();
  }

  // ── AI SourceMap: data flow view (replaces integrations catalog for aiSourceMap version) ──
  const renderAiSourceMapIntegrationsView = () => {
    const filteredSources = aiSourceFilter
      ? AI_DATA_SOURCES.filter((s) => s.name.toLowerCase().includes(aiSourceFilter.toLowerCase()))
      : AI_DATA_SOURCES;

    const liveSources = aiActiveSourceIds.filter((id) => aiWizardStates[id]?.isLive);
    const hasActiveSources = aiActiveSourceIds.length > 0;
    const hasLiveSources = liveSources.length > 0;
    const overallStatus = hasLiveSources ? 'live' : hasActiveSources ? 'idle' : null;

    const handleSourceActivate = (source: AiDataSource) => {
      if (!aiActiveSourceIds.includes(source.id)) {
        setAiActiveSourceIds((prev) => [...prev, source.id]);
      }
      setAiSelectedSourceId(source.id);
    };

    const handleReset = () => {
      setAiActiveSourceIds([]);
      setAiSelectedSourceId(null);
      setAiWizardStates({});
    };

    // ── Top bar ──
    const topBar = hasActiveSources ? (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.base};
          border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
          background: ${euiTheme.colors.backgroundBasePlain};
          flex-shrink: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>Elastic</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                Data flow
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={overallStatus === 'live' ? 'success' : 'default'}>
                {overallStatus === 'live' ? 'live' : 'idle'}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="aiSourceMapResetButton"
                size="s"
                color="text"
                onClick={handleReset}
              >
                Reset
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="aiSourceMapAutoDiscoverButton" size="s" color="text">
                Auto-discover
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="aiSourceMapExportButton" size="s" color="primary" fill>
                Export config
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : null;

    // ── Left sources panel ──
    const sourcesPanel = (
      <div
        style={{
          width: 165,
          minWidth: 165,
          borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          background: euiTheme.colors.backgroundBasePlain,
          flexShrink: 0,
        }}
      >
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            padding: ${euiTheme.size.m} ${euiTheme.size.s} ${euiTheme.size.xs};
          `}
        >
          <strong>SOURCES</strong>
        </EuiText>
        <div
          css={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.s};
          `}
        >
          <EuiFieldSearch
            data-test-subj="observabilityOnboardingRenderAiSourceMapIntegrationsViewFieldSearch"
            placeholder="Filter sources..."
            value={aiSourceFilter}
            onChange={(e) => setAiSourceFilter(e.target.value)}
            compressed
            fullWidth
          />
        </div>
        {AI_SOURCE_CATEGORIES.map((cat) => {
          const sources = filteredSources.filter((s) => s.category === cat.id);
          if (sources.length === 0) return null;
          return (
            <div key={cat.id}>
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  padding: ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.xs};
                  font-size: 10px;
                  letter-spacing: 0.06em;
                `}
              >
                <strong>{cat.label.toUpperCase()}</strong>
              </EuiText>
              <EuiListGroup flush gutterSize="none">
                {sources.map((source) => {
                  const isSelected = aiSelectedSourceId === source.id;
                  const isLive = aiWizardStates[source.id]?.isLive;
                  return (
                    <EuiListGroupItem
                      key={source.id}
                      size="xs"
                      isActive={isSelected}
                      wrapText
                      icon={
                        <img
                          ref={attachHideIntegrationLogoOnError}
                          src={`${LOGO_FALLBACK}/${source.logoDomain}/${source.logoDomain}-icon.svg`}
                          alt=""
                          style={{ width: 16, height: 16, objectFit: 'contain', display: 'block' }}
                        />
                      }
                      label={
                        <>
                          <EuiText
                            size="xs"
                            style={{ fontWeight: isSelected ? 600 : 400, lineHeight: 1.3 }}
                          >
                            {source.name}
                          </EuiText>
                          <EuiText size="xs" color="subdued">
                            {isLive ? source.volume : '\u2014'} &middot;{' '}
                            {isLive ? source.events : '\u2014'}
                          </EuiText>
                        </>
                      }
                      onClick={() => handleSourceActivate(source)}
                    />
                  );
                })}
              </EuiListGroup>
            </div>
          );
        })}
      </div>
    );

    // ── Center canvas ──
    const canvas = (() => {
      if (!hasActiveSources) {
        return (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: euiTheme.colors.backgroundBaseSubdued,
            }}
          >
            <EuiEmptyPrompt
              icon={<EuiIcon type="share" size="xl" />}
              title={<h3>No sources connected</h3>}
              body={
                <EuiText size="s" color="subdued">
                  Select a source from the left, or let AI discover what&apos;s running in your
                  environment.
                </EuiText>
              }
              actions={[
                <EuiButton
                  key="autodiscover"
                  data-test-subj="aiSourceMapAutoDiscoverEmptyButton"
                  fill
                  color="success"
                  iconType="clock"
                >
                  Auto-discover sources
                </EuiButton>,
                <EuiText key="hint" size="xs" color="subdued">
                  <em>or add manually from the left panel</em>
                </EuiText>,
              ]}
            />
          </div>
        );
      }

      return (
        <div
          style={{
            flex: 1,
            background: euiTheme.colors.backgroundBaseSubdued,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <style>{`
            @keyframes aiFlowDash { to { stroke-dashoffset: -24; } }
          `}</style>
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false} style={{ gap: 0 }}>
            {aiActiveSourceIds.map((id) => {
              const source = AI_DATA_SOURCES.find((s) => s.id === id)!;
              const ws = aiWizardStates[id];
              const step = ws?.step ?? 1;
              const isLive = ws?.isLive ?? false;
              const isSelected = aiSelectedSourceId === id;
              return (
                <EuiFlexItem key={id} grow={false}>
                  <EuiPanel
                    paddingSize="s"
                    hasShadow={false}
                    hasBorder
                    style={{
                      width: 148,
                      borderColor: isSelected
                        ? euiTheme.colors.primary
                        : isLive
                        ? euiTheme.colors.success
                        : euiTheme.colors.borderBaseSubdued,
                      cursor: 'pointer',
                      background: euiTheme.colors.backgroundBasePlain,
                    }}
                    onClick={() => setAiSelectedSourceId(id)}
                  >
                    <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <img
                          ref={attachHideIntegrationLogoOnError}
                          src={`${LOGO_FALLBACK}/${source.logoDomain}/${source.logoDomain}-icon.svg`}
                          alt={source.name}
                          style={{ width: 20, height: 20, objectFit: 'contain' }}
                        />
                      </EuiFlexItem>
                      {isLive && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="success" style={{ fontSize: 9 }}>
                            live
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" style={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {source.name}
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {isLive ? source.volume : ws ? `Step ${step} of 4` : 'Not configured'}
                    </EuiText>
                    {isLive ? (
                      <EuiText size="xs" color="subdued">
                        {source.events}
                      </EuiText>
                    ) : (
                      <EuiText size="xs" color="warning">
                        &uarr; Setup required
                      </EuiText>
                    )}
                    {isLive && (
                      <>
                        <EuiSpacer size="xs" />
                        <EuiBadge color="success" style={{ fontSize: 9 }}>
                          live &middot; collecting
                        </EuiBadge>
                      </>
                    )}
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
            {hasLiveSources && (
              <>
                <EuiFlexItem grow={false}>
                  <div style={{ width: 80, display: 'flex', alignItems: 'center' }}>
                    <svg width="80" height="4" style={{ overflow: 'visible' }}>
                      <line
                        x1="0"
                        y1="2"
                        x2="80"
                        y2="2"
                        stroke={euiTheme.colors.success}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        style={{ animation: 'aiFlowDash 0.6s linear infinite' }}
                      />
                    </svg>
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPanel
                    paddingSize="s"
                    hasShadow={false}
                    hasBorder
                    style={{
                      width: 148,
                      borderColor: euiTheme.colors.success,
                      background: euiTheme.colors.backgroundBasePlain,
                      textAlign: 'center',
                    }}
                  >
                    <EuiIcon type="logoElasticsearch" size="l" />
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" style={{ fontWeight: 600 }}>
                      Elasticsearch
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      Destination
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiBadge color="success" style={{ fontSize: 9 }}>
                      &#10003; Receiving
                    </EuiBadge>
                  </EuiPanel>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </div>
      );
    })();

    // ── Right wizard panel ──
    const wizardPanel = (() => {
      if (!aiSelectedSourceId) return null;
      const source = AI_DATA_SOURCES.find((s) => s.id === aiSelectedSourceId);
      if (!source) return null;

      const ws: AiSourceWizard = aiWizardStates[aiSelectedSourceId] ?? {
        step: 1 as const,
        authMethod: null,
        accessKeyId: '',
        secretAccessKey: '',
        authConfirmed: false,
        dataTypes: [],
        dataTypesConfirmed: false,
        services: [],
        servicesConfirmed: false,
        isLive: false,
      };

      const msgBubble = (text: React.ReactNode) => (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexStart"
          responsive={false}
          css={css`
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiAvatar size="s" name="AI" iconType="sparkles" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel paddingSize="s" hasShadow={false} color="subdued">
              <EuiText size="s">{text}</EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      const stepCircle = (status: 'in-progress' | 'pending' | 'done', num: number) => (
        <EuiAvatar
          size="s"
          name={String(num)}
          iconType={status === 'done' ? 'check' : undefined}
          color={status === 'done' ? 'success' : status === 'in-progress' ? 'warning' : 'subdued'}
        />
      );

      const stepBadge = (status: 'in-progress' | 'pending' | 'done') => (
        <EuiBadge
          color={status === 'in-progress' ? 'warning' : status === 'done' ? 'success' : 'default'}
        >
          {status === 'in-progress' ? 'in progress' : status === 'done' ? 'done' : 'pending'}
        </EuiBadge>
      );

      const stepHeader = (
        num: number,
        title: string,
        status: 'in-progress' | 'pending' | 'done'
      ) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{stepCircle(status, num)}</EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" style={{ fontWeight: 500 }}>
              {title}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{stepBadge(status)}</EuiFlexItem>
        </EuiFlexGroup>
      );

      const getStepStatus = (stepNum: number): 'in-progress' | 'pending' | 'done' => {
        if (ws.isLive) return 'done';
        if (stepNum < ws.step) return 'done';
        if (stepNum === ws.step) return 'in-progress';
        return 'pending';
      };

      const wizardStatusLabel = ws.isLive
        ? 'Live \u2014 data flowing to Elasticsearch'
        : ws.step > 1
        ? `Step ${ws.step} of 4 \u2014 ${
            ['', 'Access method', 'Data types', 'Services', 'Review'][ws.step]
          }`
        : 'Not configured \u2192 setup required';

      const wizardStatusColor = ws.isLive
        ? euiTheme.colors.success
        : ws.step > 1
        ? euiTheme.colors.warning
        : euiTheme.colors.textSubdued;

      return (
        <div
          style={{
            width: 460,
            minWidth: 460,
            borderLeft: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
            display: 'flex',
            flexDirection: 'column',
            background: euiTheme.colors.backgroundBasePlain,
            flexShrink: 0,
          }}
        >
          {/* Panel header */}
          <EuiPanel
            paddingSize="m"
            hasBorder={false}
            hasShadow={false}
            borderRadius="none"
            css={css`
              border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
              flex-shrink: 0;
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <img
                  ref={attachHideIntegrationLogoOnError}
                  src={`${LOGO_FALLBACK}/${source.logoDomain}/${source.logoDomain}-icon.svg`}
                  alt={source.name}
                  style={{ width: 28, height: 28, objectFit: 'contain' }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" style={{ fontWeight: 600 }}>
                  {source.name}
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {source.category.charAt(0).toUpperCase() + source.category.slice(1)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="aiSourceMapWizardClose"
                  iconType="cross"
                  aria-label="Close"
                  onClick={() => setAiSelectedSourceId(null)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: wizardStatusColor,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {wizardStatusLabel}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          {/* Steps content */}
          <EuiPanel
            paddingSize="m"
            hasBorder={false}
            hasShadow={false}
            borderRadius="none"
            css={css`
              flex: 1;
              overflow-y: auto;
            `}
          >
            {/* Live summary */}
            {ws.isLive && (
              <>
                {msgBubble(
                  <span>
                    <strong>{source.name}</strong> is live &mdash; {source.volume} flowing to
                    Elasticsearch. Everything looks healthy.
                  </span>
                )}
                <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                  <EuiFlexGroup responsive={false} gutterSize="none">
                    {[
                      { label: 'VOLUME', value: source.volume.split(' ')[0] },
                      { label: 'EVENTS', value: source.events.split(' ')[0] },
                      { label: 'UPTIME', value: '4h 23m' },
                      { label: 'ERRORS', value: '0' },
                    ].map(({ label, value }) => (
                      <EuiFlexItem key={label}>
                        <EuiStat
                          title={value}
                          description={label}
                          titleSize="m"
                          textAlign="center"
                        />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiSpacer size="s" />
                {(['Access method', 'Data types', 'Services', 'Review'] as const).map(
                  (title, i) => (
                    <React.Fragment key={title}>
                      {stepHeader(i + 1, title, 'done')}
                      <EuiSpacer size="s" />
                    </React.Fragment>
                  )
                )}
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="aiSourceMapWizardCloseBtn"
                      onClick={() => setAiSelectedSourceId(null)}
                    >
                      Close
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="aiSourceMapWizardRemove"
                      color="danger"
                      onClick={() => {
                        const removedId = aiSelectedSourceId;
                        setAiActiveSourceIds((prev) => prev.filter((id) => id !== removedId));
                        setAiSelectedSourceId(null);
                        setAiWizardStates((prev) => {
                          const next = { ...prev };
                          delete next[removedId];
                          return next;
                        });
                      }}
                    >
                      Remove source
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}

            {/* In-progress wizard steps */}
            {!ws.isLive && (
              <>
                {/* Step 1 — Access method */}
                {stepHeader(1, 'Access method', getStepStatus(1))}
                {ws.step === 1 && (
                  <>
                    <EuiSpacer size="s" />
                    {msgBubble('How would you like to authenticate to AWS?')}
                    <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                      {(
                        [
                          { id: 'iam', label: 'IAM Role (recommended)' },
                          { id: 'access-key', label: 'Access Key + Secret' },
                          { id: 'existing-agent', label: 'Use existing agent' },
                        ] as Array<{ id: AiSourceWizard['authMethod']; label: string }>
                      ).map((opt) => (
                        <EuiFlexItem grow={false} key={opt.id!}>
                          <EuiButton
                            data-test-subj={`aiSourceMapAuth-${opt.id}`}
                            size="s"
                            fill={ws.authMethod === opt.id}
                            color={ws.authMethod === opt.id ? 'warning' : 'text'}
                            onClick={() =>
                              updateAiWizard(aiSelectedSourceId, { authMethod: opt.id })
                            }
                          >
                            {opt.label}
                          </EuiButton>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>

                    {ws.authMethod === 'access-key' && (
                      <>
                        <EuiSpacer size="m" />
                        {msgBubble(
                          "I'll need your Access Key ID and Secret. Make sure to restrict permissions to the minimum required."
                        )}
                        <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                          <EuiText size="xs" color="subdued">
                            <strong style={{ letterSpacing: '0.05em' }}>CONFIGURATION</strong>
                          </EuiText>
                          <EuiSpacer size="s" />
                          <EuiFormRow label="AWS Access Key ID">
                            <EuiFieldText
                              data-test-subj="aiSourceMapAccessKeyId"
                              value={ws.accessKeyId}
                              onChange={(e) =>
                                updateAiWizard(aiSelectedSourceId, {
                                  accessKeyId: e.target.value,
                                })
                              }
                              placeholder="AKIAIOSFODNN7EXAMPLE"
                              compressed
                            />
                          </EuiFormRow>
                          <EuiFormRow
                            label="AWS Secret Access Key"
                            helpText="Stored encrypted at rest"
                          >
                            <EuiFieldPassword
                              data-test-subj="aiSourceMapSecretKey"
                              value={ws.secretAccessKey}
                              onChange={(e) =>
                                updateAiWizard(aiSelectedSourceId, {
                                  secretAccessKey: e.target.value,
                                })
                              }
                              compressed
                            />
                          </EuiFormRow>
                        </EuiPanel>
                        <EuiSpacer size="s" />
                        <EuiFlexGroup gutterSize="s" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              data-test-subj="aiSourceMapContinueToDataTypes"
                              fill
                              disabled={!ws.accessKeyId}
                              iconType="arrowDown"
                              iconSide="right"
                              onClick={() =>
                                updateAiWizard(aiSelectedSourceId, {
                                  authConfirmed: true,
                                  step: 2,
                                })
                              }
                            >
                              Continue to Data types
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty data-test-subj="aiSourceMapSaveForLater" size="s">
                              Save for later
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </>
                    )}

                    {(ws.authMethod === 'iam' || ws.authMethod === 'existing-agent') && (
                      <>
                        <EuiSpacer size="m" />
                        {msgBubble(
                          ws.authMethod === 'iam'
                            ? "I'll use an IAM Role to authenticate. Make sure the role has the required permissions."
                            : 'I found an existing Elastic Agent. I can use that to collect data from this source.'
                        )}
                        <EuiButton
                          data-test-subj="aiSourceMapContinueAuth"
                          fill
                          iconType="arrowDown"
                          iconSide="right"
                          onClick={() =>
                            updateAiWizard(aiSelectedSourceId, {
                              authConfirmed: true,
                              step: 2,
                            })
                          }
                        >
                          Continue to Data types
                        </EuiButton>
                      </>
                    )}
                  </>
                )}

                {/* Step 2 — Data types */}
                {ws.step >= 2 && (
                  <>
                    <EuiHorizontalRule margin="s" />
                    {stepHeader(2, 'Data types', getStepStatus(2))}
                    {ws.step === 2 && (
                      <>
                        <EuiSpacer size="s" />
                        {msgBubble(
                          'What types of data do you want to collect from AWS? You can select multiple.'
                        )}
                        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                          {['Metrics', 'Logs', 'Traces', 'Infrastructure events'].map((dt) => {
                            const isSelected = ws.dataTypes.includes(dt);
                            return (
                              <EuiFlexItem grow={false} key={dt}>
                                <EuiButton
                                  data-test-subj={`aiSourceMapDataType-${dt}`}
                                  size="s"
                                  fill={isSelected}
                                  color={isSelected ? 'success' : 'text'}
                                  onClick={() => {
                                    const next = isSelected
                                      ? ws.dataTypes.filter((d) => d !== dt)
                                      : [...ws.dataTypes, dt];
                                    updateAiWizard(aiSelectedSourceId, { dataTypes: next });
                                  }}
                                >
                                  {dt}
                                </EuiButton>
                              </EuiFlexItem>
                            );
                          })}
                        </EuiFlexGroup>
                        <EuiSpacer size="s" />
                        <EuiButton
                          data-test-subj="aiSourceMapConfirmDataTypes"
                          fill
                          disabled={ws.dataTypes.length === 0}
                          onClick={() =>
                            updateAiWizard(aiSelectedSourceId, {
                              dataTypesConfirmed: true,
                              step: 3,
                            })
                          }
                        >
                          Confirm selection
                        </EuiButton>
                      </>
                    )}
                  </>
                )}

                {/* Step 3 — Services */}
                {ws.step >= 3 && (
                  <>
                    <EuiHorizontalRule margin="s" />
                    {stepHeader(3, 'Services', getStepStatus(3))}
                    {ws.step === 3 && (
                      <>
                        <EuiSpacer size="s" />
                        {msgBubble(
                          "Which AWS services do you want to monitor? I'll configure the right integrations and dashboards for each one."
                        )}
                        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                          {[
                            'EC2',
                            'RDS',
                            'S3',
                            'Lambda',
                            'EKS',
                            'ECS',
                            'CloudFront',
                            'API Gateway',
                            'SQS / SNS',
                            'DynamoDB',
                            'ElastiCache',
                          ].map((svc) => {
                            const isSelected = ws.services.includes(svc);
                            return (
                              <EuiFlexItem grow={false} key={svc}>
                                <EuiButton
                                  data-test-subj={`aiSourceMapService-${svc}`}
                                  size="s"
                                  fill={isSelected}
                                  color={isSelected ? 'success' : 'text'}
                                  onClick={() => {
                                    const next = isSelected
                                      ? ws.services.filter((s) => s !== svc)
                                      : [...ws.services, svc];
                                    updateAiWizard(aiSelectedSourceId, { services: next });
                                  }}
                                >
                                  {svc}
                                </EuiButton>
                              </EuiFlexItem>
                            );
                          })}
                        </EuiFlexGroup>
                        <EuiSpacer size="s" />
                        <EuiButton
                          data-test-subj="aiSourceMapConfirmServices"
                          fill
                          disabled={ws.services.length === 0}
                          onClick={() =>
                            updateAiWizard(aiSelectedSourceId, {
                              servicesConfirmed: true,
                              step: 4,
                            })
                          }
                        >
                          Confirm selection
                        </EuiButton>
                        <EuiSpacer size="s" />
                        <EuiText size="xs" color="subdued">
                          not sure? try
                        </EuiText>
                        <EuiSpacer size="xs" />
                        <EuiPanel
                          paddingSize="s"
                          hasBorder
                          hasShadow={false}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {}}
                        >
                          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="clock" color="primary" />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiText size="s" style={{ fontWeight: 500 }}>
                                Discover my services automatically
                              </EuiText>
                              <EuiText size="xs" color="subdued">
                                Runs a script in AWS CloudShell &mdash; takes about 30 seconds
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="arrowRight" color="subdued" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                      </>
                    )}
                  </>
                )}

                {/* Step 4 — Review */}
                {ws.step >= 4 && (
                  <>
                    <EuiHorizontalRule margin="s" />
                    {stepHeader(4, 'Review', getStepStatus(4))}
                    {ws.step === 4 && (
                      <>
                        <EuiSpacer size="s" />
                        {msgBubble(
                          <span>
                            Everything looks good! I&apos;ll configure{' '}
                            <strong>{source.name}</strong> with the settings you selected. This
                            should take about 30 seconds.
                          </span>
                        )}
                        <EuiButton
                          data-test-subj="aiSourceMapGoLive"
                          fill
                          color="success"
                          onClick={() => updateAiWizard(aiSelectedSourceId, { isLive: true })}
                        >
                          Confirm &amp; go live
                        </EuiButton>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </EuiPanel>

          {/* Ask AI footer */}
          <EuiPanel
            paddingSize="s"
            hasBorder={false}
            hasShadow={false}
            borderRadius="none"
            css={css`
              border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
              flex-shrink: 0;
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiFieldSearch
                  data-test-subj="aiSourceMapAskAI"
                  placeholder="Ask AI about this source..."
                  compressed
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="aiSourceMapAskAISubmit"
                  fill
                  size="s"
                  iconType="arrowRight"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </div>
      );
    })();

    // ── Bottom stats bar ──
    const bottomBar = hasActiveSources ? (
      <EuiFlexGroup
        gutterSize="none"
        justifyContent="center"
        responsive={false}
        css={css`
          border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
          background: ${euiTheme.colors.backgroundBasePlain};
          padding: ${euiTheme.size.m} ${euiTheme.size.xl};
          flex-shrink: 0;
        `}
      >
        {[
          { label: 'sources', value: String(aiActiveSourceIds.length) },
          { label: 'configured', value: String(liveSources.length) },
          {
            label: 'volume',
            value: hasLiveSources
              ? `${liveSources
                  .reduce((sum, id) => {
                    const vol = AI_DATA_SOURCES.find((s) => s.id === id)?.volume ?? '0 GB/h';
                    return sum + parseFloat(vol);
                  }, 0)
                  .toFixed(1)} GB/h`
              : '0 GB/h',
          },
          {
            label: 'events',
            value: hasLiveSources
              ? AI_DATA_SOURCES.find((s) => s.id === liveSources[0])?.events ?? '0/s'
              : '0/s',
          },
        ].map(({ label, value }) => (
          <EuiFlexItem
            key={label}
            grow={false}
            css={css`
              padding: 0 ${euiTheme.size.xl};
            `}
          >
            <EuiStat title={value} description={label} titleSize="m" textAlign="center" />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ) : null;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 'calc(100vh - 48px)',
        }}
      >
        {topBar}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {sourcesPanel}
          {canvas}
          {wizardPanel}
        </div>
        {bottomBar}
      </div>
    );
  };
  // ── end renderAiSourceMapIntegrationsView ────────────────────────────────

  return (
    <>
      <EuiPageTemplate
        paddingSize="none"
        restrictWidth={false}
        css={css`
          padding-top: 0 !important;
        `}
      >
        <EuiPageTemplate.Section paddingSize="none" restrictWidth={false} grow>
          {activeNavId === 'get-started' && renderGetStartedView()}
          {activeNavId === INGEST_HUB_ADD_DATA_NAV_ID &&
            (activeVersion === 'aiSourceMap'
              ? renderAiSourceMapIntegrationsView()
              : isIngestHubVersion2AddDataPage(activeVersion, activeNavId)
              ? renderVersion2AddDataView()
              : renderIntegrationsView())}
          {activeNavId === 'platform-migration' && renderPlatformMigrationView()}
          {activeNavId === 'migration-dashboards' &&
            renderMigrationPlaceholder(
              dashboardsHeaderImg,
              'Dashboard Migration',
              'Import and migrate dashboards from other platforms into Elastic Observability',
              'Dashboard migration tools coming soon.'
            )}
          {activeNavId === 'migration-rules' &&
            renderMigrationPlaceholder(
              rulesHeaderImg,
              'Rules & Monitors Migration',
              'Import and migrate alerting rules and monitors from other platforms into Elastic',
              'Rules & monitors migration tools coming soon.'
            )}
          {activeNavId === 'data-management' && renderStreamsView()}
        </EuiPageTemplate.Section>

        {flyoutTile && flyoutTile.id === 'kubernetes' && (
          <KubernetesFlyout
            logoUrl={flyoutTile.logoUrl ?? ''}
            onClose={() => setFlyoutTile(null)}
          />
        )}

        {flyoutTile && flyoutTile.id === 'aws' && (
          <AwsFlyout
            logoUrl={flyoutTile.logoUrl ?? ''}
            onClose={() => setFlyoutTile(null)}
            onSeeMyData={() => seedAwsLogsAndNavigateToDiscover()}
          />
        )}

        {flyoutTile && flyoutTile.id === 'crowdstrike' && (
          <CrowdStrikeFlyout onClose={() => setFlyoutTile(null)} />
        )}

        {flyoutTile && 'endpointLabel' in flyoutTile && (
          <EuiFlyout
            ownFocus
            onClose={() => setFlyoutTile(null)}
            aria-labelledby="apiIngestionFlyoutTitle"
            css={css`
              inline-size: 72vw !important;
              & .euiFlyoutHeader {
                padding-block: 32px !important;
                padding-inline: 32px !important;
              }
              & .euiFlyoutBody__overflowContent {
                padding-block: 32px !important;
                padding-inline: 32px !important;
              }
              & .euiFlyoutFooter {
                padding-block: 16px !important;
                padding-inline: 32px !important;
              }
            `}
          >
            <EuiFlyoutHeader hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <CardLogoIcon
                    src={(flyoutTile as ApiIngestionTile).logoUrl ?? ''}
                    alt={`${flyoutTile.name} logo`}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="m">
                    <h2 id="apiIngestionFlyoutTitle">{flyoutTile.name}</h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiText>
                <p>{(flyoutTile as ApiIngestionTile).description}</p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <div
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      border: 1px solid ${euiTheme.colors.borderBaseSubdued};
                      border-radius: 6px;
                      padding: 8px 12px;
                      font-family: ${euiTheme.font.familyCode};
                      font-size: 14px;
                      min-width: 240px;
                    `}
                  >
                    <span style={{ flex: 1 }}>
                      {(flyoutTile as ApiIngestionTile).endpointLabel}
                    </span>
                    <EuiCopy textToCopy={(flyoutTile as ApiIngestionTile).endpointLabel}>
                      {(copy) => (
                        <EuiButtonIcon
                          data-test-subj="observabilityOnboardingIngestHubPageButton"
                          iconType="copy"
                          aria-label="Copy endpoint"
                          onClick={copy}
                          size="xs"
                        />
                      )}
                    </EuiCopy>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="observabilityOnboardingIngestHubPageManageApiKeysButton"
                    size="s"
                  >
                    Manage API Keys
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="observabilityOnboardingIngestHubPageCreateNewApiKeyButton"
                    size="s"
                  >
                    Create new API Key
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiButtonEmpty
                data-test-subj="observabilityOnboardingIngestHubPageCloseButton"
                onClick={() => setFlyoutTile(null)}
              >
                Close
              </EuiButtonEmpty>
            </EuiFlyoutFooter>
          </EuiFlyout>
        )}

        {flyoutTile &&
          flyoutTile.id !== 'kubernetes' &&
          flyoutTile.id !== 'aws' &&
          flyoutTile.id !== 'crowdstrike' &&
          !('endpointLabel' in flyoutTile) && (
            <EuiFlyout
              ownFocus
              onClose={() => setFlyoutTile(null)}
              aria-labelledby="flyoutTileTitle"
              css={css`
                inline-size: 72vw !important;
                & .euiFlyoutHeader {
                  padding-block: 32px !important;
                  padding-inline: 32px !important;
                }
                & .euiFlyoutBody__overflowContent {
                  padding-block: 32px !important;
                  padding-inline: 32px !important;
                }
                & .euiFlyoutFooter {
                  padding-block: 16px !important;
                  padding-inline: 32px !important;
                }
              `}
            >
              <EuiFlyoutHeader hasBorder>
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <CardLogoIcon src={flyoutTile.logoUrl ?? ''} alt={`${flyoutTile.name} logo`} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="m">
                      <h2 id="flyoutTileTitle">{flyoutTile.name}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                {flyoutTile.description ? (
                  <EuiText>
                    <p>{flyoutTile.description}</p>
                  </EuiText>
                ) : (
                  <EuiText color="subdued">
                    <p>No additional details available for this integration.</p>
                  </EuiText>
                )}
              </EuiFlyoutBody>
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="observabilityOnboardingIngestHubPageCloseButton"
                      onClick={() => setFlyoutTile(null)}
                    >
                      Close
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton data-test-subj="observabilityOnboardingIngestHubPageButton" fill>
                      Add {flyoutTile.name}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            </EuiFlyout>
          )}

        {isGetStartedFlyoutOpen && (
          <EuiFlyout
            ownFocus
            type="overlay"
            session="start"
            flyoutMenuProps={{
              title: 'Welcome to Elastic Observability',
              hideCloseButton: isStopFillVersion,
            }}
            onClose={isStopFillVersion ? () => {} : () => setIsGetStartedFlyoutOpen(false)}
            hideCloseButton={isStopFillVersion}
            aria-labelledby="getStartedFlyoutTitle"
            css={css`
              inline-size: 72vw !important;
              animation-duration: 0s !important;
              transition-duration: 0s !important;
              [class*='euiFlyoutMenu__container'] {
                border-block-end: none !important;
                block-size: 0 !important;
                padding: 0 !important;
                min-height: 0 !important;
                overflow: hidden !important;
              }
              & .euiFlyoutHeader {
                padding-block: 32px !important;
                padding-inline: 32px !important;
              }
              & .euiFlyoutBody__overflowContent {
                padding-block: 32px !important;
                padding-inline: 32px !important;
              }
              & .euiFlyoutFooter {
                padding-block: 16px !important;
                padding-inline: 32px !important;
              }
            `}
          >
            <EuiFlyoutHeader hasBorder>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 16,
                }}
              >
                <EuiIcon type="logoObservability" size="xxl" />
                <div>
                  <EuiTitle size="m">
                    <h2 id="getStartedFlyoutTitle">Welcome to Elastic Observability</h2>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText grow={false}>
                    <p>
                      Your starting point to ingest data, create alerts, manage SLOs, explore
                      Streams, and get the most out of your observability stack
                    </p>
                  </EuiText>
                </div>
              </div>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <div
                css={css`
                  margin-bottom: 48px;
                `}
              >
                <EuiTitle size="s">
                  <h3>Get started adding your data</h3>
                </EuiTitle>
                <EuiText
                  size="s"
                  color="subdued"
                  css={css`
                    margin-top: 4px;
                  `}
                >
                  <p>Connect your data sources to start monitoring your infrastructure.</p>
                </EuiText>
              </div>
              {SECTIONS.map((section, idx) => (
                <React.Fragment key={section.title}>
                  {idx > 0 && <div style={{ height: 40 }} />}
                  <EuiTitle size="xs">
                    <h3>{section.title}</h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <p>{section.description}.</p>
                  </EuiText>
                  <EuiSpacer size="xl" />
                  {renderCompactGrid(section.tiles, undefined, undefined, setWelcomeChildTile)}
                </React.Fragment>
              ))}
              {SAAS_TILES.length > 0 && (
                <>
                  <div style={{ height: 40 }} />
                  <EuiTitle size="xs">
                    <h3>SaaS Products</h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
                    <p>Monitor your cloud resources without installing an agent.</p>
                  </EuiText>
                  <EuiSpacer size="xl" />
                  {renderCompactGrid(SAAS_TILES, undefined, undefined, setWelcomeChildTile)}
                </>
              )}
            </EuiFlyoutBody>
            {isStopVersion && (
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="observabilityOnboardingIngestHubPageSkipButton"
                      onClick={() => setIsGetStartedFlyoutOpen(false)}
                    >
                      Skip
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            )}

            {welcomeChildTile && welcomeChildTile.id === 'kubernetes' && (
              <KubernetesFlyout
                logoUrl={welcomeChildTile.logoUrl ?? ''}
                onClose={() => setWelcomeChildTile(null)}
                isChild
                hideCloseButton={isStopFillVersion}
              />
            )}

            {welcomeChildTile && welcomeChildTile.id === 'aws' && (
              <AwsFlyout
                logoUrl={welcomeChildTile.logoUrl ?? ''}
                onClose={() => setWelcomeChildTile(null)}
                onSeeMyData={() => seedAwsLogsAndNavigateToDiscover()}
                isChild
                hideCloseButton={isStopFillVersion}
              />
            )}

            {welcomeChildTile &&
              welcomeChildTile.id !== 'kubernetes' &&
              welcomeChildTile.id !== 'aws' && (
                <EuiFlyout
                  onClose={() => setWelcomeChildTile(null)}
                  aria-labelledby="welcomeChildFlyoutTitle"
                  session="start"
                  flyoutMenuProps={{ title: welcomeChildTile.name }}
                  css={css`
                    inline-size: 72vw !important;
                    animation-duration: 0s !important;
                    transition-duration: 0s !important;
                    [class*='euiFlyoutMenu__container'] {
                      border-block-end: none !important;
                    }
                    & .euiFlyoutHeader {
                      padding-block: 32px !important;
                      padding-inline: 32px !important;
                    }
                    & .euiFlyoutBody__overflowContent {
                      padding-block: 32px !important;
                      padding-inline: 32px !important;
                    }
                    & .euiFlyoutFooter {
                      padding-block: 16px !important;
                      padding-inline: 32px !important;
                    }
                  `}
                >
                  <EuiFlyoutHeader hasBorder>
                    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <CardLogoIcon
                          src={welcomeChildTile.logoUrl ?? ''}
                          alt={`${welcomeChildTile.name} logo`}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiTitle size="m">
                          <h2 id="welcomeChildFlyoutTitle">{welcomeChildTile.name}</h2>
                        </EuiTitle>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlyoutHeader>
                  <EuiFlyoutBody>
                    {welcomeChildTile.description ? (
                      <EuiText>
                        <p>{welcomeChildTile.description}</p>
                      </EuiText>
                    ) : (
                      <EuiText color="subdued">
                        <p>No additional details available for this integration.</p>
                      </EuiText>
                    )}
                  </EuiFlyoutBody>
                  <EuiFlyoutFooter>
                    <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButton data-test-subj="observabilityOnboardingIngestHubPageButton" fill>
                          Add {welcomeChildTile.name}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlyoutFooter>
                </EuiFlyout>
              )}
          </EuiFlyout>
        )}
      </EuiPageTemplate>
    </>
  );
};
