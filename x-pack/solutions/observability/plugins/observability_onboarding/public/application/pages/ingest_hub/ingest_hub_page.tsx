/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import { useParams, useHistory, useRouteMatch } from 'react-router-dom';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSideNav,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
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
} from './ingest_hub_data';
import type { IntegrationTile } from './ingest_hub_data';
import { IntegrationCard, CompactIntegrationCard, CardLogoIcon } from './ingest_hub_components';
import { KubernetesFlyout } from './kubernetes_flyout';
import { AwsFlyout } from './aws_flyout';
import rocketImg from './assets/rocket.png';
import integrationsHeaderImg from './assets/integrations-header.png';
import apiEndpointHeaderImg from './assets/api-endpoint-header.png';
import platformMigrationHeaderImg from './assets/platform-migration-header.png';
import dashboardsHeaderImg from './assets/dashboards-header.png';
import rulesHeaderImg from './assets/rules-header.png';


type TaggedTile = IntegrationTile & { badge?: string };

const SECTION_TO_NAV_ID: Record<string, string> = {
  integrations: 'integrations',
  'api-endpoint': 'api-endpoint',
  'platform-migration': 'platform-migration',
  dashboards: 'migration-dashboards',
  rules: 'migration-rules',
};

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useActiveVersion, versionStore } from '../../version_switcher_widget';
import type { IngestHubVersion } from '../../version_switcher_widget';

export const IngestHubPage: React.FC = () => {
  const { services } = useKibana();
  const [activeVersion] = useActiveVersion();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
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
  const [step1Tab, setStep1Tab] = useState<'integrations' | 'migration'>('integrations');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [integrationsSearch, setIntegrationsSearch] = useState<string>('');
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
  const [flyoutTile, setFlyoutTile] = useState<{
    id: string;
    name: string;
    description?: string;
    logoDomain: string;
    logoUrl?: string;
  } | null>(null);

  const [packagesSearch, setPackagesSearch] = useState('');
  const [packagesCategory, setPackagesCategory] = useState('all');
  const [assetsSearch, setAssetsSearch] = useState('');
  const [assetsCategory, setAssetsCategory] = useState('all');
  const [connectorsSearch, setConnectorsSearch] = useState('');
  const [connectorsCategory, setConnectorsCategory] = useState('all');

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

  const apiAccordionCss = css`
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: 8px;
    overflow: hidden;
    & > .euiAccordion__triggerWrapper {
      padding: 24px;
      cursor: pointer;
    }
    & .euiAccordion__children {
      padding: 0 24px 24px;
    }
  `;

  const sideNavCss = css`
    overflow-x: hidden;
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
      > .euiSideNavItem:nth-child(5) {
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

  const renderApiEndpointAccordion = (
    id: string,
    icon: React.ReactNode,
    title: string,
    desc: string,
    endpointLabel: string,
    isInitiallyOpen?: boolean
  ) => (
    <EuiAccordion
      id={id}
      initialIsOpen={isInitiallyOpen}
      arrowDisplay="left"
      borders="none"
      buttonElement="div"
      buttonProps={{ paddingSize: 's' as const }}
      paddingSize="s"
      css={apiAccordionCss}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem>
            <strong>{title}</strong>
            <EuiText size="s" color="subdued">
              <p>{desc}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
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
            <span style={{ flex: 1 }}>{endpointLabel}</span>
            <EuiCopy textToCopy={endpointLabel}>
              {(copy) => (
                <EuiButtonIcon
                  data-test-subj="observabilityOnboardingRenderApiEndpointAccordionButton"
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
            data-test-subj="observabilityOnboardingRenderApiEndpointAccordionManageApiKeysButton"
            size="s"
          >
            Manage API Keys
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="observabilityOnboardingRenderApiEndpointAccordionCreateNewApiKeyButton"
            size="s"
          >
            Create new API Key
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );

  const renderSectionPageHeader = (imageSrc: string, heading: string, subtitle: string) => (
    <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
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
        <div
          style={{
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
            borderRadius: 12,
            padding: 4,
            flexShrink: 0,
          }}
        >
          <img
            src={imageSrc}
            alt={heading}
            style={{ width: 64, height: 64, objectFit: 'contain', display: 'block' }}
          />
        </div>
        <div>
          <EuiTitle size="l">
            <h2>{heading}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
            {subtitle}
          </EuiText>
        </div>
      </div>
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
      <div style={{ height: 12 }} />
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
                  name: 'Any category',
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
        <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
          {renderSectionPageHeader(
            integrationsHeaderImg,
            'Add data to Elastic Observability',
            'Monitor your applications and infrastructure with powerful logs, metrics, traces, and AI-driven insights'
          )}
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
            >
              Installed
            </EuiTab>
          </EuiTabs>
        </div>
        <EuiHorizontalRule margin="none" css={dividerStyle} />
        <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
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
          {integrationsTab === 'installed' && (
            <EuiEmptyPrompt
              iconType="package"
              title={<h3>No integrations installed</h3>}
              body={
                <p>
                  Install your first integration to start collecting data. Browse integrations to
                  find the right one for your use case.
                </p>
              }
              actions={[
                <EuiButton
                  data-test-subj="observabilityOnboardingInstalledTabBrowseIntegrationsButton"
                  onClick={() => {
                    setIntegrationsTab('all');
                    setSelectedCategory('all');
                    setIntegrationsSearch('');
                  }}
                >
                  Browse integrations
                </EuiButton>,
              ]}
            />
          )}
        </div>
      </>
    );
  };

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

  const isStopVersion = activeVersion === 'skipUx';
  const isStopFillVersion = activeVersion === 'blockUx';
  const [leavingForDiscover, setLeavingForDiscover] = useState(false);
  const [isGetStartedFlyoutOpen, setIsGetStartedFlyoutOpen] = useState(
    !routeSection || routeSection === 'get-started'
  );
  const [welcomeChildTile, setWelcomeChildTile] = useState<IntegrationTile | null>(null);

  useEffect(() => {
    if (!routeSection || routeSection === 'get-started') {
      setIsGetStartedFlyoutOpen(true);
      setWelcomeChildTile(null);
    }
  }, [activeVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeVersion !== 'blockUx' || leavingForDiscover) return;
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
  }, [activeVersion, leavingForDiscover]);

  useEffect(() => {
    if (activeVersion === 'skipUx') {
      services.chrome?.sideNav.setIsCollapsed(false);
    }
  }, [activeVersion, services.chrome]);


  const renderAddDataRecommendedContent = () => {
    return (
      <>
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
              <EuiTitle size="xs">
                <h3>{section.title}</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p style={{ margin: 0, display: 'inline' }}>{section.description}.{' '}</p>
                <EuiButtonEmpty
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
                  onClick={() => {
                    setSelectedCategory(`integration:${integrationCategory}`);
                  }}
                >
                  View all
                </EuiButtonEmpty>
              </EuiText>
              <div style={{ height: 12 }} />
              {renderCompactGrid(section.tiles)}
            </React.Fragment>
          );
        })}
        {SAAS_TILES.length > 0 && (
          <>
            <div style={{ height: 40 }} />
            <EuiTitle size="xs">
              <h3>SaaS Products</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
              <p style={{ margin: 0, display: 'inline' }}>Monitor your cloud resources without installing an agent.{' '}</p>
              <EuiButtonEmpty
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
            </EuiText>
            <div style={{ height: 12 }} />
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
        <EuiSpacer size="l" />
        {SECTIONS.map((section, idx) => (
          <React.Fragment key={section.title}>
            {idx > 0 && <div style={{ height: 40 }} />}
            <EuiTitle size="xxs" css={css`color: ${euiTheme.colors.textSubdued};`}>
              <h3>{section.title}</h3>
            </EuiTitle>
            <div style={{ height: 8 }} />
            {renderCompactGrid(section.tiles)}
          </React.Fragment>
        ))}
        {SAAS_TILES.length > 0 && (
          <>
            <div style={{ height: 40 }} />
            <EuiTitle size="xxs" css={css`color: ${euiTheme.colors.textSubdued};`}>
              <h3>SaaS Products</h3>
            </EuiTitle>
            <div style={{ height: 8 }} />
            {renderCompactGrid(SAAS_TILES)}
          </>
        )}
        {EXPAND_STACK_TILES.length > 0 && (
          <>
            <div style={{ height: 40 }} />
            <EuiTitle size="xxs" css={css`color: ${euiTheme.colors.textSubdued};`}>
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
      ...unique.map((t) => ({ ...t, badge: undefined as string | undefined })),
      ...PACKAGES.map((t) => ({ ...t, badge: 'Input package' as string | undefined })),
      ...ASSET_TILES.map((t) => ({ ...t, badge: 'Asset' as string | undefined })),
      ...CONNECTOR_TILES.map((t) => ({ ...t, badge: 'Connector' as string | undefined })),
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
            .map((t) => ({ ...t, badge: undefined }))
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
        ? unique.map((t) => ({ ...t, badge: undefined }))
        : sectionKey === 'all-packages'
        ? PACKAGES.map((t) => ({ ...t, badge: 'Input package' }))
        : sectionKey === 'all-assets'
        ? ASSET_TILES.map((t) => ({ ...t, badge: 'Asset' }))
        : sectionKey === 'all-connectors'
        ? CONNECTOR_TILES.map((t) => ({ ...t, badge: 'Connector' }))
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
        <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
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
                      icon: <EuiIcon type="starFilled" size="m" />,
                      isSelected: selectedCategory === 'all',
                      onClick: () => {
                        setSelectedCategory('all');
                      },
                    },
                    {
                      id: 'nav-integrations',
                      name: 'Integrations',
                      icon: <EuiIcon type="apps" size="m" />,
                      items: [
                        {
                          id: 'cat-int-all',
                          name: 'Any category',
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
                      items: [
                        {
                          id: 'cat-pkg-all',
                          name: 'Any category',
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
                      items: [
                        {
                          id: 'cat-asset-all',
                          name: 'Any category',
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
                      items: [
                        {
                          id: 'cat-conn-all',
                          name: 'Any category',
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
            ) : (
              <>
                <EuiTitle size="xs">
                  <h2>All catalogue</h2>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  <p>Complete catalogue of integrations, input packages, assets, and connectors.</p>
                </EuiText>
                <EuiSpacer size="l" />
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
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {renderSectionPageHeader(
          rocketImg,
          'Get started with Elastic Observability',
          'Your starting point to ingest data, create alerts, manage SLOs, explore Streams, and get the most out of your observability stack'
        )}
      </div>
      <EuiHorizontalRule margin="none" css={dividerStyle} />
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ height: 40 }} />
        <EuiAccordion
          id="step1-add-data"
          initialIsOpen
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
              css={css`gap: 16px;`}
            >
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3 css={css`display: flex; align-items: center; gap: 8px;`}>
                    <span css={css`display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: ${euiTheme.colors.backgroundBaseSubdued}; flex-shrink: 0;`}>
                      <EuiIcon type="plusInCircle" size="m" />
                    </span>
                    Add your data
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                  <p>Connect your data sources or migrate from another platform to start monitoring your infrastructure.</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiFlexGroup gutterSize="l" style={{ paddingTop: 16 }}>
            <EuiFlexItem>
              <EuiPanel
                hasBorder
                paddingSize="l"
                css={css`
                  cursor: pointer;
                  height: 100%;
                  transition: box-shadow 0.15s ease-in;
                  &:hover {
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                  }
                `}
                onClick={() => {
                  history.push(`${basePath}/integrations`);
                  setIntegrationsTab('all');
                  setSelectedCategory('all');
                }}
              >
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="center" responsive={false} css={css`text-align: center;`}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="package" size="xl" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>Recommended integrations</h4>
                    </EuiTitle>
                    <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                      <p>Browse integrations for logs, metrics, and traces.</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel
                hasBorder
                paddingSize="l"
                css={css`
                  cursor: pointer;
                  height: 100%;
                  transition: box-shadow 0.15s ease-in;
                  &:hover {
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                  }
                `}
                onClick={() => {
                  history.push(`${basePath}/platform-migration`);
                }}
              >
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="center" responsive={false} css={css`text-align: center;`}>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <img
                          src={`${LOGO_FALLBACK}/datadoghq/datadoghq-icon.svg`}
                          alt="Datadog"
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <img
                          src={`${LOGO_FALLBACK}/newrelic/newrelic-icon.svg`}
                          alt="New Relic"
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <img
                          src={`${LOGO_FALLBACK}/grafana/grafana-icon.svg`}
                          alt="Grafana"
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>Platform migration</h4>
                    </EuiTitle>
                    <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                      <p>Migrate from Splunk, Datadog, or others.</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel
                hasBorder
                paddingSize="l"
                css={css`
                  cursor: pointer;
                  height: 100%;
                  transition: box-shadow 0.15s ease-in;
                  &:hover {
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                  }
                `}
                onClick={() => {
                  history.push(`${basePath}/api-endpoint`);
                }}
              >
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="center" responsive={false} css={css`text-align: center;`}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="endpoint" size="xl" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>API connection</h4>
                    </EuiTitle>
                    <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                      <p>Send data via REST API or OpenTelemetry.</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel
                hasBorder
                paddingSize="l"
                css={css`
                  cursor: pointer;
                  height: 100%;
                  transition: box-shadow 0.15s ease-in;
                  &:hover {
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                  }
                `}
                onClick={() => {
                  /* TODO: navigate to demo environment */
                }}
              >
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="center" responsive={false} css={css`text-align: center;`}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="play" size="xl" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>Demo environment</h4>
                    </EuiTitle>
                    <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                      <p>Explore a fully loaded sample environment.</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
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
                    <h3 css={css`display: flex; align-items: center; gap: 8px;`}>
                      <span css={css`display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: ${euiTheme.colors.backgroundBaseSubdued}; flex-shrink: 0;`}>
                        <EuiIcon type="devToolsApp" size="m" />
                      </span>
                      Turn raw data into structured with Streams
                    </h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                    <p>
                      Use Streams to route, transform, and organize your incoming data into
                      structured formats for easier querying and analysis.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">Requires data</EuiBadge>
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
                  <EuiButton disabled>Open Streams</EuiButton>
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
                    <h3 css={css`display: flex; align-items: center; gap: 8px;`}>
                      <span css={css`display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: ${euiTheme.colors.backgroundBaseSubdued}; flex-shrink: 0;`}>
                        <EuiIcon type="dashboardApp" size="m" />
                      </span>
                      Analyze your data using Dashboards
                    </h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                    <p>
                      Create and customize dashboards to visualize your data, track key metrics, and
                      gain insights across your infrastructure and applications.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">Requires data</EuiBadge>
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
                  <EuiButton disabled>Open Dashboards</EuiButton>
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
                    <h3 css={css`display: flex; align-items: center; gap: 8px;`}>
                      <span css={css`display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: ${euiTheme.colors.backgroundBaseSubdued}; flex-shrink: 0;`}>
                        <EuiIcon type="watchesApp" size="m" />
                      </span>
                      Get notified when issues occur with Alerts
                    </h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                    <p>
                      Set up alerting rules to get notified when metrics cross thresholds, services
                      go down, or anomalies are detected.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">Requires data</EuiBadge>
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
                  <EuiButton disabled>Open Alerts</EuiButton>
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
                    <h3 css={css`display: flex; align-items: center; gap: 8px;`}>
                      <span css={css`display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: ${euiTheme.colors.backgroundBaseSubdued}; flex-shrink: 0;`}>
                        <EuiIcon type="uptimeApp" size="m" />
                      </span>
                      Spot and troubleshoot issues early with SLOs
                    </h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
                    <p>
                      Define Service Level Objectives to track reliability, measure error budgets,
                      and catch degradations before they impact users.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">Requires data</EuiBadge>
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
                  <EuiButton disabled>Open SLOs</EuiButton>
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

        <EuiFlexGroup gutterSize="m" style={{ marginTop: 'auto', paddingTop: 80, marginBottom: 64 }}>
          <EuiFlexItem>
            <EuiPanel
              data-test-subj="observabilityOnboardingGetStartedObservabilityForumCard"
              hasBorder
              paddingSize="m"
              css={css`border-radius: 8px; text-align: center;`}
            >
              <EuiTitle size="xxs"><h4>Observability Forum</h4></EuiTitle>
              <EuiText size="s" color="subdued" css={css`margin-bottom: 4px;`}>Exchange thoughts about Elastic.</EuiText>
              <EuiText size="xs">
                <EuiLink href="https://discuss.elastic.co" target="_blank" external>
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
              css={css`border-radius: 8px; text-align: center;`}
            >
              <EuiTitle size="xxs"><h4>Documentation</h4></EuiTitle>
              <EuiText size="s" color="subdued" css={css`margin-bottom: 4px;`}>In-depth guides and reference content.</EuiText>
              <EuiText size="xs">
                <EuiLink
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
              css={css`border-radius: 8px; text-align: center;`}
            >
              <EuiTitle size="xxs"><h4>Support Hub</h4></EuiTitle>
              <EuiText size="s" color="subdued" css={css`margin-bottom: 4px;`}>Get help by opening a case.</EuiText>
              <EuiText size="xs">
                <EuiLink href="https://support.elastic.co" target="_blank" external>
                  Open Support Hub
                </EuiLink>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );

  const renderApiEndpointView = () => (
    <>
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {renderSectionPageHeader(
          apiEndpointHeaderImg,
          'API Endpoint',
          'Send data directly to Elastic using API endpoints. Choose the method that best fits your use case.'
        )}
      </div>
      <EuiHorizontalRule margin="none" css={dividerStyle} />
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        <div style={{ height: 40 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderApiEndpointAccordion(
            'api-apm',
            <EuiIcon type="apmApp" size="l" />,
            'APM',
            'Send application performance data, traces, and errors using APM agents or OpenTelemetry.',
            'endpoint_access',
            true
          )}
          {renderApiEndpointAccordion(
            'api-elasticsearch',
            <EuiIcon type="logoElasticsearch" size="l" />,
            'Elasticsearch',
            'Index and query observability data directly using the Elasticsearch API or bulk ingestion.',
            'elasticsearch_access'
          )}
          {renderApiEndpointAccordion(
            'api-kibana',
            <EuiIcon type="logoKibana" size="l" />,
            'Kibana',
            'Access Kibana programmatically or embed dashboards using the Kibana API.',
            'endpoint_access'
          )}
          {renderApiEndpointAccordion(
            'api-ingest',
            <EuiIcon type="logoElastic" size="l" />,
            'Ingest',
            'Send data from Beats, Logstash, or Fleet-managed agents to your Elastic deployment.',
            'endpoint_access'
          )}
        </div>
      </div>
    </>
  );

  const renderMigrationPlaceholder = (
    imageSrc: string,
    heading: string,
    subtitle: string,
    placeholder: string
  ) => (
    <>
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>{renderSectionPageHeader(imageSrc, heading, subtitle)}</div>
      <EuiHorizontalRule margin="none" css={dividerStyle} />
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        <div style={{ height: 40 }} />
        <EuiText color="subdued">{placeholder}</EuiText>
      </div>
    </>
  );

  const renderPlatformMigrationView = () => (
    <>
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {renderSectionPageHeader(
          platformMigrationHeaderImg,
          'Platform Migration',
          'Migrate dashboards, rules, and data pipelines from other observability platforms into Elastic'
        )}
      </div>
      <EuiHorizontalRule margin="none" css={dividerStyle} />
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        <div style={{ height: 40 }} />
        {renderPlatformMigrationContent()}
      </div>
    </>
  );

  const seedAwsLogsAndNavigateToDiscover = async () => {
    setWelcomeChildTile(null);

    const now = Date.now();
    const sources = [
      {
        index: 'logs-aws.cloudtrail-default',
        dataset: 'aws.cloudtrail',
        messages: [
          { level: 'info', msg: 'AssumeRole performed by user:admin from IP 10.0.1.54', action: 'AssumeRole' },
          { level: 'info', msg: 'ConsoleLogin for user:dev-engineer from 192.168.1.100', action: 'ConsoleLogin' },
          { level: 'info', msg: 'CreateBucket action on resource arn:aws:s3:::app-logs-backup', action: 'CreateBucket' },
          { level: 'info', msg: 'PutObject to s3://production-data/configs/app.yaml', action: 'PutObject' },
          { level: 'info', msg: 'DescribeInstances called by role:ECSServiceRole', action: 'DescribeInstances' },
          { level: 'warning', msg: 'AuthorizeSecurityGroupIngress on sg-0a1b2c3d4e5f from 0.0.0.0/0', action: 'AuthorizeSecurityGroupIngress' },
          { level: 'info', msg: 'DeleteObject from s3://temp-uploads/batch-7291.tmp', action: 'DeleteObject' },
          { level: 'info', msg: 'RunInstances launched i-0abc123def456 (t3.medium)', action: 'RunInstances' },
        ],
      },
      {
        index: 'logs-aws.vpcflow-default',
        dataset: 'aws.vpcflow',
        messages: [
          { level: 'info', msg: '10.0.3.45 → 10.0.5.22:443 ACCEPT 12 packets 4892 bytes', action: 'ACCEPT' },
          { level: 'error', msg: '10.0.1.17 → 172.16.0.5:22 REJECT 3 packets 180 bytes', action: 'REJECT' },
          { level: 'info', msg: '10.0.2.88 → 10.0.4.100:5432 ACCEPT 45 packets 32400 bytes', action: 'ACCEPT' },
          { level: 'info', msg: '192.168.1.50 → 10.0.3.10:80 ACCEPT 8 packets 2048 bytes', action: 'ACCEPT' },
          { level: 'error', msg: '10.0.5.12 → 10.0.1.4:3389 REJECT 7 packets 420 bytes', action: 'REJECT' },
          { level: 'info', msg: '10.0.4.100 → 10.0.6.15:8443 ACCEPT 34 packets 22100 bytes', action: 'ACCEPT' },
        ],
      },
      {
        index: 'logs-aws.cloudwatch_logs-default',
        dataset: 'aws.cloudwatch_logs',
        messages: [
          { level: 'info', msg: '[INFO] Lambda function app-processor invoked successfully in 245ms', action: 'LambdaInvoke' },
          { level: 'error', msg: '[ERROR] Connection timeout to RDS instance db-prod-01 after 30s', action: 'RDSTimeout' },
          { level: 'warning', msg: '[WARN] Memory utilization at 87% for ECS task web-service/abc123', action: 'ECSMemory' },
          { level: 'info', msg: '[INFO] API Gateway request 200 OK — GET /api/v1/users — 12ms', action: 'APIGateway' },
          { level: 'info', msg: '[DEBUG] DynamoDB query consumed 5.0 RCU on table user-sessions', action: 'DynamoDBQuery' },
          { level: 'error', msg: '[ERROR] ECS container health check failed for task web-service/def456', action: 'ECSHealthCheck' },
        ],
      },
      {
        index: 'logs-aws.s3access-default',
        dataset: 'aws.s3access',
        messages: [
          { level: 'info', msg: 'REST.GET.OBJECT production-data/reports/2026-03-09.csv — 200 — 14ms', action: 'GET' },
          { level: 'info', msg: 'REST.PUT.OBJECT app-logs-backup/2026/03/09/ct-log.gz — 200 — 8ms', action: 'PUT' },
          { level: 'info', msg: 'REST.GET.BUCKET production-data — 200 — prefix=configs/', action: 'GET' },
          { level: 'info', msg: 'REST.HEAD.OBJECT static-assets/images/logo.png — 200 — 3ms', action: 'HEAD' },
          { level: 'info', msg: 'REST.DELETE.OBJECT temp-uploads/batch-7291.tmp — 204 — 5ms', action: 'DELETE' },
        ],
      },
      {
        index: 'logs-aws.guardduty-default',
        dataset: 'aws.guardduty',
        messages: [
          { level: 'error', msg: 'UnauthorizedAccess:EC2/SSHBruteForce on i-0abc123def456 — severity: HIGH', action: 'SSHBruteForce' },
          { level: 'warning', msg: 'Recon:EC2/PortProbeUnprotectedPort on i-0def456abc789 — severity: MEDIUM', action: 'PortProbe' },
          { level: 'error', msg: 'CryptoCurrency:EC2/BitcoinTool.B on i-0789abc123def — severity: HIGH', action: 'BitcoinTool' },
          { level: 'warning', msg: 'UnauthorizedAccess:IAMUser/MaliciousIPCaller on user:test-account — severity: LOW', action: 'MaliciousIP' },
          { level: 'error', msg: 'Trojan:EC2/DNSDataExfiltration on i-0abc999def111 — severity: HIGH', action: 'DNSExfiltration' },
        ],
      },
      {
        index: 'logs-aws.elb_logs-default',
        dataset: 'aws.elb_logs',
        messages: [
          { level: 'info', msg: 'https 200 app/web-alb/abc123 10.0.1.50:443 "GET /api/health HTTP/2" 0.015s', action: 'GET' },
          { level: 'info', msg: 'https 200 app/web-alb/abc123 10.0.2.31:443 "POST /api/v1/events HTTP/2" 0.008s', action: 'POST' },
          { level: 'error', msg: 'https 502 app/web-alb/abc123 10.0.3.72:443 "GET /api/v1/dashboard HTTP/2" 0.030s', action: 'GET' },
          { level: 'info', msg: 'https 200 app/web-alb/abc123 10.0.4.18:443 "GET /static/app.js HTTP/2" 0.003s', action: 'GET' },
          { level: 'warning', msg: 'https 429 app/web-alb/abc123 10.0.5.91:443 "POST /api/v1/ingest HTTP/2" 0.045s', action: 'POST' },
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
          bulkBody += JSON.stringify({
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

    const basePath = services.http?.basePath.get() ?? '';

    try {
      const resp = await fetch(`${basePath}/api/console/proxy?path=${encodeURIComponent('/_bulk')}&method=POST`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
        body: bulkBody,
      });
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
      } catch { /* last resort: proceed without data */ }
    }

    let dataViewId = '';
    try {
      const existing = await services.http?.get('/api/data_views');
      const dvList = (existing as { data_view?: Array<{ id: string; title: string; name?: string }> })?.data_view ?? [];
      const allLogs = dvList.find((dv) =>
        dv.name?.toLowerCase() === 'all logs' || dv.title === 'logs-*' || dv.title === 'logs-*-*'
      );
      dataViewId = allLogs?.id ?? '';
    } catch { /* ignore */ }

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

    const discoverPath = dataViewId
      ? `#/?_a=(dataSource:(dataViewId:'${dataViewId}',type:dataView))`
      : undefined;
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
      <div css={css`flex: 1; overflow-y: auto;`}>
        <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
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
                Your starting point to ingest data, create alerts, manage SLOs, explore Streams, and get the most out of your observability stack
              </EuiText>
            </div>
          </div>
        </div>
        <EuiHorizontalRule margin="none" css={dividerStyle} />
        <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
          <div style={{ height: 32 }} />
          <div css={css`margin-bottom: 48px;`}>
            <EuiTitle size="s">
              <h3>Add your data</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
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
              <div style={{ height: 12 }} />
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
              <div style={{ height: 12 }} />
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

      {welcomeChildTile && welcomeChildTile.id !== 'kubernetes' && welcomeChildTile.id !== 'aws' && (
        <EuiFlyout
          ownFocus
          onClose={() => setWelcomeChildTile(null)}
          aria-labelledby="blockUxChildFlyoutTitle"
          css={css`
            inline-size: 50vw !important;
          `}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <CardLogoIcon src={welcomeChildTile.logoUrl ?? ''} alt={`${welcomeChildTile.name} logo`} />
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
                <EuiButton fill>
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

  if (isStopFillVersion && !leavingForDiscover) {
    return renderBlockUxPage();
  }

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
        {activeNavId === 'integrations' && renderIntegrationsView()}
        {activeNavId === 'api-endpoint' && renderApiEndpointView()}
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

      {flyoutTile && flyoutTile.id !== 'kubernetes' && flyoutTile.id !== 'aws' && (
        <EuiFlyout
          ownFocus
          onClose={() => setFlyoutTile(null)}
          aria-labelledby="flyoutTileTitle"
          css={css`
            inline-size: 50vw !important;
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
          flyoutMenuProps={{ title: 'Welcome to Elastic Observability', hideCloseButton: isStopFillVersion }}
          onClose={isStopFillVersion ? () => {} : () => setIsGetStartedFlyoutOpen(false)}
          hideCloseButton={isStopFillVersion}
          aria-labelledby="getStartedFlyoutTitle"
          css={css`
            inline-size: 65vw !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
            [class*="euiFlyoutMenu__container"] {
              border-block-end: none !important;
              block-size: 0 !important;
              padding: 0 !important;
              min-height: 0 !important;
              overflow: hidden !important;
            }
            & .euiFlyoutHeader {
              padding: 32px !important;
            }
            & .euiFlyoutBody__overflowContent {
              padding: 32px !important;
            }
            & .euiFlyoutFooter {
              padding: 32px !important;
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
                <EuiTitle size="l">
                  <h2 id="getStartedFlyoutTitle">Welcome to Elastic Observability</h2>
                </EuiTitle>
                <EuiText size="s" color="subdued" style={{ marginTop: 4 }}>
                  Your starting point to ingest data, create alerts, manage SLOs, explore Streams, and get the most out of your observability stack
                </EuiText>
              </div>
            </div>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <div css={css`margin-bottom: 48px;`}>
              <EuiTitle size="s">
                <h3>Get started adding your data</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued" css={css`margin-top: 4px;`}>
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
                <div style={{ height: 12 }} />
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
                <div style={{ height: 12 }} />
                {renderCompactGrid(SAAS_TILES, undefined, undefined, setWelcomeChildTile)}
              </>
            )}
          </EuiFlyoutBody>
          {isStopVersion && (
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
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

          {welcomeChildTile && welcomeChildTile.id !== 'kubernetes' && welcomeChildTile.id !== 'aws' && (
            <EuiFlyout
              onClose={() => setWelcomeChildTile(null)}
              aria-labelledby="welcomeChildFlyoutTitle"
              session="start"
              flyoutMenuProps={{ title: welcomeChildTile.name }}
              css={css`
                inline-size: 65vw !important;
                animation-duration: 0s !important;
                transition-duration: 0s !important;
                [class*="euiFlyoutMenu__container"] {
                  border-block-end: none !important;
                }
                & .euiFlyoutHeader {
                  padding: 32px !important;
                }
                & .euiFlyoutBody__overflowContent {
                  padding: 32px !important;
                }
                & .euiFlyoutFooter {
                  padding: 32px !important;
                }
              `}
            >
              <EuiFlyoutHeader hasBorder>
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <CardLogoIcon src={welcomeChildTile.logoUrl ?? ''} alt={`${welcomeChildTile.name} logo`} />
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
                    <EuiButton fill>
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
