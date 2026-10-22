/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { NightshiftAppHeader, type NightshiftAppHeaderProps } from '../app/app_header';
import { useKibana } from '../hooks/use_kibana';
import { useKnowledgeTabsAvailability } from './hooks/use_knowledge_tabs_availability';
import {
  getVisibleKnowledgeTabs,
  getDefaultKnowledgeTab,
  isKnowledgeTabId,
  KNOWLEDGE_TAB_LABELS,
} from './knowledge_tabs';
const KnowledgeIndicatorsTab = React.lazy(() =>
  import('./knowledge_indicators/tab').then((module) => ({
    default: module.KnowledgeIndicatorsTab,
  }))
);
const CortexTab = React.lazy(() =>
  import('./cortex/tab').then((module) => ({ default: module.CortexTab }))
);
const MemoryTab = React.lazy(() =>
  import('./memory/tab').then((module) => ({ default: module.MemoryTab }))
);
const DecisionTreesTab = React.lazy(() =>
  import('./decision_trees/tab').then((module) => ({ default: module.DecisionTreesTab }))
);

const nightshiftLabel = i18n.translate('xpack.nightshift.knowledgePage.backToNightshiftLabel', {
  defaultMessage: 'Nightshift',
});

export type KnowledgePageHeaderProps = Pick<
  NightshiftAppHeaderProps,
  | 'onManagementClick'
  | 'managementHref'
  | 'onSourcesClick'
  | 'sourcesHref'
  | 'onSettingsClick'
  | 'settingsHref'
  | 'onSandboxSecretsClick'
  | 'onAutomationsClick'
  | 'automationsHref'
>;

const KnowledgeLoadingSpinner = () => (
  <EuiLoadingSpinner size="xl" data-test-subj="nightshiftKnowledgePageLoading" />
);

const KnowledgePageLoading = () => (
  <EuiPageTemplate.Section component="div" restrictWidth={false}>
    <KnowledgeLoadingSpinner />
  </EuiPageTemplate.Section>
);

export function KnowledgePage({
  headerProps,
}: {
  headerProps: KnowledgePageHeaderProps;
}): React.ReactElement {
  const { application } = useKibana().services;
  const { tab } = useParams<{ tab?: string }>();
  const history = useHistory();
  const availability = useKnowledgeTabsAvailability();

  if (tab && isKnowledgeTabId(tab) && availability[tab].isLoading) {
    return <KnowledgePageLoading />;
  }

  const isVisibleRequestedTab =
    tab !== undefined && isKnowledgeTabId(tab) && availability[tab].isEnabled;

  if (!isVisibleRequestedTab) {
    const defaultTab = getDefaultKnowledgeTab(availability);
    if (defaultTab === 'loading') {
      return <KnowledgePageLoading />;
    }

    return <Redirect to={defaultTab ? `/knowledge/${defaultTab}` : '/'} />;
  }

  const visibleTabs = getVisibleKnowledgeTabs(availability);
  const tabs = visibleTabs.map((id) => ({
    id,
    label: KNOWLEDGE_TAB_LABELS[id],
    isSelected: tab === id,
    ...(id === 'decision_trees' && { badge: { iconType: 'code' } }),
    href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: `/knowledge/${id}` }),
    onClick: (event?: React.MouseEvent) => {
      event?.preventDefault();
      history.push(`/knowledge/${id}`);
    },
    'data-test-subj': `nightshiftKnowledgeTab-${id}`,
  }));

  return (
    <>
      <NightshiftAppHeader
        {...headerProps}
        page="knowledge"
        back={{
          href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/' }),
          label: nightshiftLabel,
        }}
        tabs={tabs}
      />
      <EuiPageTemplate.Section component="div" restrictWidth={false}>
        <React.Suspense fallback={<KnowledgeLoadingSpinner />}>
          {tab === 'knowledge_indicators' && <KnowledgeIndicatorsTab />}
          {tab === 'cortex' && <CortexTab />}
          {tab === 'memory' && <MemoryTab />}
          {tab === 'decision_trees' && <DecisionTreesTab />}
        </React.Suspense>
      </EuiPageTemplate.Section>
    </>
  );
}
