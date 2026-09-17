/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiTab, EuiTabs, EuiText } from '@elastic/eui';
import { CoverageOverviewLink } from '../../../../common/components/links_to_docs';
import { HeaderPage } from '../../../../common/components/header_page';

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

const CoverageOverviewHeaderComponent = () => (
  <HeaderPage title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE} />
);

const CoverageOverviewHeader = React.memo(CoverageOverviewHeaderComponent);

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
            <CoverageOverviewTacticPanel tactic={tactic} />
          </EuiFlexItem>

          {tactic.techniques.map((technique, techniqueKey) => (
            <EuiFlexItem grow={false} key={`${technique.id}-${techniqueKey}`}>
              <CoverageOverviewMitreTechniquePanelPopover technique={technique} />
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

  const onAttackTabClick = useCallback(() => {
    setSelectedTab(CoverageFrameworkTab.Attack);
  }, []);

  const onAtlasTabClick = useCallback(() => {
    setSelectedTab(CoverageFrameworkTab.Atlas);
  }, []);

  const isAttackTab = selectedTab === CoverageFrameworkTab.Attack;

  return (
    <>
      <CoverageOverviewHeader />
      <EuiTabs data-test-subj="coverageOverviewFrameworkTabs">
        <EuiTab
          onClick={onAttackTabClick}
          isSelected={isAttackTab}
          data-test-subj="coverageOverviewAttackTab"
        >
          {i18n.ATTACK_FRAMEWORK_TAB}
        </EuiTab>
        <EuiTab
          onClick={onAtlasTabClick}
          isSelected={!isAttackTab}
          data-test-subj="coverageOverviewAtlasTab"
        >
          {i18n.ATLAS_FRAMEWORK_TAB}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer />
      {isAttackTab ? (
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
      )}
    </>
  );
};

export const CoverageOverviewDashboard = CoverageOverviewDashboardComponent;
