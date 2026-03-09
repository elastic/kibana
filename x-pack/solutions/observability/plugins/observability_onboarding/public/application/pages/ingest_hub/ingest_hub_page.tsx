/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { useParams } from 'react-router-dom';
import {
  EuiAccordion,
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
  EuiPageTemplate,
  EuiPopover,
  EuiSelectable,
  EuiSideNav,
  EuiSpacer,
  EuiStepNumber,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
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

export const IngestHubPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
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
    { label: 'Recommended', checked: 'on' as 'on' | undefined },
    { label: 'Name (A\u2013Z)', checked: undefined as 'on' | undefined },
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
      cursor: pointer;
      text-decoration: none !important;
    }
    & .euiAccordion__triggerWrapper * {
      text-decoration: none !important;
    }
    & .euiAccordion__children {
      padding: 0 24px 24px;
    }
    & .euiAccordion__triggerWrapper > .euiFlexGroup {
      gap: 16px;
    }
    & .euiAccordion__iconWrapper {
      margin-inline-end: 16px;
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

  const renderCompactGrid = (tiles: IntegrationTile[], badge?: string, columns?: number) => (
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
          onClick={() => setFlyoutTile(tile)}
        />
      ))}
    </div>
  );

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
      </>
    );
  };

  const renderBrowseAllTab = () => {
    const rawQ = integrationsSearch.startsWith('category:')
      ? ''
      : integrationsSearch.trim().toLowerCase();

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
    const isRecommendedSort = activeSort === 'Recommended';
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
            if (val.trim() === '' || !val.startsWith('category:')) {
              setSelectedCategory('all');
            }
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
                      name: 'All',
                      icon: <EuiIcon type="logoElastic" size="m" color="text" />,
                      isSelected: selectedCategory === 'all',
                      onClick: () => {
                        setSelectedCategory('all');
                        setIntegrationsSearch('');
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
                            setIntegrationsSearch('category:All integrations');
                          },
                        },
                        ...INTEGRATION_CATEGORIES.map((cat) => ({
                          id: `cat-int-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `integration:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`integration:${cat}`);
                            setIntegrationsSearch(`category:${cat}`);
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
                            setIntegrationsSearch('category:All input packages');
                          },
                        },
                        ...PACKAGE_CATEGORIES.map((cat) => ({
                          id: `cat-pkg-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `package:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`package:${cat}`);
                            setIntegrationsSearch(`category:${cat}`);
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
                            setIntegrationsSearch('category:All assets');
                          },
                        },
                        ...ASSET_CATEGORIES.map((cat) => ({
                          id: `cat-asset-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `asset:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`asset:${cat}`);
                            setIntegrationsSearch(`category:${cat}`);
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
                            setIntegrationsSearch('category:All connectors');
                          },
                        },
                        ...CONNECTOR_CATEGORIES.map((cat) => ({
                          id: `cat-conn-${cat.toLowerCase().replace(/\s+/g, '-')}`,
                          name: cat,
                          isSelected: selectedCategory === `connector:${cat}`,
                          onClick: () => {
                            setSelectedCategory(`connector:${cat}`);
                            setIntegrationsSearch(`category:${cat}`);
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
            {selectedCategory === 'all' && !rawQ && isRecommendedSort && (
              <>
                {renderRecommendedContent()}
                <div style={{ height: 56 }} />
              </>
            )}
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  const renderGetStartedView = () => (
    <>
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {renderSectionPageHeader(
          rocketImg,
          'Welcome to Elastic Observability',
          'Your starting point to ingest data, create alerts, manage SLOs, explore Streams, and get the most out of your observability stack'
        )}
      </div>
      <EuiHorizontalRule margin="none" css={dividerStyle} />
      <div css={paddedContent} style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        <div style={{ height: 40 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <EuiAccordion
            id="step1-data"
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
                css={css`
                  gap: 16px;
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiStepNumber number={1} status="current" titleSize="none" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>Get started adding your data</h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <p>Browse integrations or migrate from another platform.</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <div style={{ height: 16 }} />
            <EuiTabs
              css={css`
                box-shadow: none;
                border-bottom: none;
              `}
            >
              <EuiTab
                isSelected={step1Tab === 'integrations'}
                onClick={() => setStep1Tab('integrations')}
              >
                Browse integrations
              </EuiTab>
              <EuiTab
                isSelected={step1Tab === 'migration'}
                onClick={() => setStep1Tab('migration')}
              >
                Platform migration
              </EuiTab>
            </EuiTabs>
            <EuiHorizontalRule margin="none" css={dividerStyle} />
            <div style={{ height: 24 }} />
            {step1Tab === 'integrations' && (
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
                      {idx > 0 && <div style={{ height: 80 }} />}
                      {renderSectionWithViewAll(section, () => {
                        setActiveNavId('integrations');
                        setIntegrationsTab('all');
                        setSelectedCategory(`integration:${integrationCategory}`);
                        setIntegrationsSearch(`category:${integrationCategory}`);
                      })}
                    </React.Fragment>
                  );
                })}
                {SAAS_TILES.length > 0 && (
                  <>
                    <div style={{ height: 80 }} />
                    <EuiTitle
                      size="xs"
                      css={css`
                        color: ${euiTheme.colors.textHeading};
                      `}
                    >
                      <h2>SaaS Products</h2>
                    </EuiTitle>
                    <EuiText size="s" color="subdued" style={{ marginTop: 0 }}>
                      <p style={{ margin: 0, display: 'inline' }}>
                        Monitor your cloud resources without installing an agent.{' '}
                      </p>
                      <EuiButtonEmpty
                        data-test-subj="observabilityOnboardingRenderGetStartedViewViewAllSaaSProductsButton"
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
                          setActiveNavId('integrations');
                          setIntegrationsTab('all');
                          setSetupOptions((prev) =>
                            prev.map((o) => ({
                              ...o,
                              checked: o.label === 'Agentless' ? ('on' as const) : undefined,
                            }))
                          );
                        }}
                      >
                        View all SaaS Products
                      </EuiButtonEmpty>
                    </EuiText>
                    <div style={{ height: 12 }} />
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${SAAS_TILES.length}, 1fr)`,
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      {SAAS_TILES.map((tile) => (
                        <IntegrationCard
                          key={tile.id}
                          name={tile.name}
                          description={tile.description}
                          logoDomain={tile.logoDomain}
                          logoUrl={tile.logoUrl}
                          centerAlign
                          onClick={() => setFlyoutTile(tile)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {step1Tab === 'migration' && (
              <div style={{ padding: '40px 0' }}>{renderPlatformMigrationContent()}</div>
            )}
          </EuiAccordion>

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
                <EuiFlexItem grow={false}>
                  <EuiStepNumber number={2} status="incomplete" titleSize="none" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>Structure your data</h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <p>
                      Use Streams to route, transform, and organize your incoming data into
                      structured formats for easier querying and analysis.
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiText size="s" color="subdued">
              <p>
                Streams allow you to define how data flows through your Elastic deployment, applying
                transformations, filters, and routing rules to organize incoming data.
              </p>
            </EuiText>
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
                <EuiFlexItem grow={false}>
                  <EuiStepNumber number={3} status="incomplete" titleSize="none" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>Analyze your data</h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <p>
                      Create and customize dashboards to visualize your data, track key metrics, and
                      gain insights across your infrastructure and applications.
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiText size="s" color="subdued">
              <p>
                Dashboards provide a powerful way to visualize and explore your observability data
                in real time.
              </p>
            </EuiText>
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
                <EuiFlexItem grow={false}>
                  <EuiStepNumber number={4} status="incomplete" titleSize="none" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>Get notified when issues occur with alerts</h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <p>
                      Set up alerting rules to get notified when metrics cross thresholds, services
                      go down, or anomalies are detected.
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiText size="s" color="subdued">
              <p>
                Configure alerting rules and notification channels to stay informed about issues in
                your infrastructure.
              </p>
            </EuiText>
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
                <EuiFlexItem grow={false}>
                  <EuiStepNumber number={5} status="incomplete" titleSize="none" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>Spot and troubleshoot issues early with SLOs</h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <p>
                      Define Service Level Objectives to track reliability, measure error budgets,
                      and catch degradations before they impact users.
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiText size="s" color="subdued">
              <p>
                SLOs help you set measurable targets for service reliability and track your error
                budget over time.
              </p>
            </EuiText>
          </EuiAccordion>
        </div>

        <div style={{ height: 80 }} />
      </div>
      <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityOnboardingRenderGetStartedViewManageYourDeploymentButton"
              size="s"
              iconType="managementApp"
              href="#"
              target="_blank"
            >
              Manage your deployment
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityOnboardingRenderGetStartedViewBrowseDocsButton"
              size="s"
              iconType="documentation"
              href="https://www.elastic.co/docs/solutions/observability"
              target="_blank"
            >
              Browse docs
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityOnboardingRenderGetStartedViewJoinTheSlackButton"
              size="s"
              iconType="users"
              href="https://ela.st/slack"
              target="_blank"
            >
              Join the Slack
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityOnboardingRenderGetStartedViewOptIntoUserResearchButton"
              size="s"
              iconType="userAvatar"
              href="#"
              target="_blank"
            >
              Opt into user research
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div style={{ height: 40 }} />
      </div>
    </>
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

  return (
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

      {flyoutTile && flyoutTile.id !== 'kubernetes' && (
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
    </EuiPageTemplate>
  );
};
