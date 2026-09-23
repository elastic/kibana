/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { i18n as i18nCore } from '@kbn/i18n';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { CoverageOverviewLink } from '../../../../common/components/links_to_docs';
import { useAddIntegrationsUrl } from '../../../../common/hooks/use_add_integrations_url';
import { useKibana } from '../../../../common/lib/kibana';

import * as i18n from './translations';
import { CoverageOverviewTacticPanel } from './tactic_panel';
import { CoverageOverviewMitreTechniquePanelPopover } from './technique_panel_popover';
import { CoverageOverviewFiltersPanel } from './filters_panel';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { CoverageOverviewInvalidMitreRulesCallout } from './invalid_mitre_rules_callout';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { AtlasMatrix } from './atlas_matrix';

const ATLAS_LEARN_MORE_URL = 'https://atlas.mitre.org/';

const CoverageFrameworkTab = {
  Attack: 'attack',
  Atlas: 'atlas',
} as const;

type CoverageFrameworkTab = (typeof CoverageFrameworkTab)[keyof typeof CoverageFrameworkTab];

interface CoverageOverviewHeaderProps {
  selectedTab: CoverageFrameworkTab;
  onSelectAttack: () => void;
  onSelectAtlas: () => void;
}

const CoverageOverviewHeader: React.FC<CoverageOverviewHeaderProps> = ({
  selectedTab,
  onSelectAttack,
  onSelectAtlas,
}) => {
  const { docLinks } = useKibana().services;
  const { href: addIntegrationsHref } = useAddIntegrationsUrl();
  const { navigateTo } = useNavigateTo();

  const tabs = useMemo<AppHeaderTab[]>(
    () => [
      {
        id: CoverageFrameworkTab.Attack,
        label: i18n.ATTACK_FRAMEWORK_TAB,
        isSelected: selectedTab === CoverageFrameworkTab.Attack,
        onClick: onSelectAttack,
        'data-test-subj': 'coverageOverviewAttackTab',
      },
      {
        id: CoverageFrameworkTab.Atlas,
        label: i18n.ATLAS_FRAMEWORK_TAB,
        isSelected: selectedTab === CoverageFrameworkTab.Atlas,
        onClick: onSelectAtlas,
        'data-test-subj': 'coverageOverviewAtlasTab',
      },
    ],
    [onSelectAttack, onSelectAtlas, selectedTab]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'addIntegrations',
          label: i18nCore.translate(
            'xpack.securitySolution.coverageOverviewDashboard.addIntegrationsMenuItem',
            { defaultMessage: 'Add integrations' }
          ),
          iconType: 'indexOpen',
          href: addIntegrationsHref,
          overflow: true,
          testId: 'coverageOverviewHeaderAddIntegrations',
          run: () => {
            navigateTo({ url: addIntegrationsHref });
          },
        },
      ],
    }),
    [addIntegrationsHref, navigateTo]
  );

  return (
    // [Chrome Next] Migrated header — parent supplies the Figma 16px page grid via bleed.
    <AppHeader
      title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE}
      tabs={tabs}
      menu={menu}
      docLink={docLinks.links.siem.mitreCoverage}
      spacing="bleed"
    />
  );
};

const AttackTabDescription = () => (
  <EuiText color="subdued" size="s" data-test-subj="coverageOverviewAttackDescription">
    <span>{i18n.CoverageOverviewDashboardInformation}</span> <CoverageOverviewLink />
  </EuiText>
);

const AtlasTabDescription = () => (
  <EuiText color="subdued" size="s" data-test-subj="coverageOverviewAtlasDescription">
    <span>{i18n.AtlasCoverageDashboardInformation}</span>{' '}
    <EuiLink href={ATLAS_LEARN_MORE_URL} target="_blank" external>
      {i18n.ATLAS_LEARN_MORE}
    </EuiLink>
  </EuiText>
);

const AttackCoverageMatrix = () => {
  const {
    state: { data },
  } = useCoverageOverviewDashboardContext();

  const usePrototypeColors = useMemo(
    () =>
      !data?.mitreTactics.some((tactic) =>
        tactic.techniques.some(
          (technique) => technique.enabledRules.length > 0 || technique.disabledRules.length > 0
        )
      ),
    [data?.mitreTactics]
  );

  return (
    <EuiFlexGroup gutterSize="m" className="eui-xScroll" tabIndex={0}>
      {data?.mitreTactics.map((tactic) => (
        <EuiFlexGroup
          data-test-subj={`coverageOverviewTacticGroup-${tactic.id}`}
          direction="column"
          key={tactic.id}
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <CoverageOverviewTacticPanel tactic={tactic} usePrototype={usePrototypeColors} />
          </EuiFlexItem>

          {tactic.techniques.map((technique, techniqueKey) => (
            <EuiFlexItem grow={false} key={`${technique.id}-${techniqueKey}`}>
              <CoverageOverviewMitreTechniquePanelPopover
                technique={technique}
                techniqueIndex={techniqueKey}
                usePrototype={usePrototypeColors}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  );
};

const CoverageOverviewDashboardComponent = () => {
  const [selectedTab, setSelectedTab] = useState<CoverageFrameworkTab>(CoverageFrameworkTab.Attack);
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );
  const { euiTheme } = useEuiTheme();

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — same pattern as Rules.
  const chromeNextPage = css`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

  const onAttackTabClick = useCallback(() => {
    setSelectedTab(CoverageFrameworkTab.Attack);
  }, []);

  const onAtlasTabClick = useCallback(() => {
    setSelectedTab(CoverageFrameworkTab.Atlas);
  }, []);

  const isAttackTab = selectedTab === CoverageFrameworkTab.Attack;

  const tabContent = isAttackTab ? (
    <>
      <AttackTabDescription />
      <EuiSpacer />
      {isMitreAttackUpdatesUIEnabled && <CoverageOverviewInvalidMitreRulesCallout />}
      <CoverageOverviewFiltersPanel />
      <EuiSpacer />
      <AttackCoverageMatrix />
    </>
  ) : (
    <>
      <AtlasTabDescription />
      <EuiSpacer />
      <AtlasMatrix />
    </>
  );

  return (
    <div css={chromeNextPage}>
      <CoverageOverviewHeader
        selectedTab={selectedTab}
        onSelectAttack={onAttackTabClick}
        onSelectAtlas={onAtlasTabClick}
      />
      <EuiSpacer size="m" />
      {tabContent}
    </div>
  );
};

export const CoverageOverviewDashboard = CoverageOverviewDashboardComponent;
