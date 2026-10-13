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
import { CortexTab } from './cortex/tab';
import { DecisionTreesTab } from './decision_trees/tab';
import { useKnowledgeTabsAvailability } from './hooks/use_knowledge_tabs_availability';
import {
  getVisibleKnowledgeTabs,
  isAnyKnowledgeTabLoading,
  isKnowledgeTabId,
  KNOWLEDGE_TAB_LABELS,
} from './knowledge_tabs';
import { MemoryTab } from './memory/tab';

const nightshiftLabel = i18n.translate('xpack.nightshift.knowledgePage.backToNightshiftLabel', {
  defaultMessage: 'Nightshift',
});

export type KnowledgePageHeaderProps = Pick<
  NightshiftAppHeaderProps,
  | 'onManagementClick'
  | 'managementHref'
  | 'onSettingsClick'
  | 'settingsHref'
  | 'onSandboxSecretsClick'
  | 'onAutomationsClick'
  | 'automationsHref'
>;

const KnowledgePageLoading = () => (
  <EuiPageTemplate.Section component="div" restrictWidth={false}>
    <EuiLoadingSpinner size="xl" data-test-subj="nightshiftKnowledgePageLoading" />
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
    if (isAnyKnowledgeTabLoading(availability)) {
      return <KnowledgePageLoading />;
    }

    const [firstVisibleTab] = getVisibleKnowledgeTabs(availability);
    return <Redirect to={firstVisibleTab ? `/knowledge/${firstVisibleTab}` : '/'} />;
  }

  const visibleTabs = getVisibleKnowledgeTabs(availability);
  const tabs = visibleTabs.map((id) => ({
    id,
    label: KNOWLEDGE_TAB_LABELS[id],
    isSelected: tab === id,
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
        {tab === 'cortex' && <CortexTab />}
        {tab === 'memory' && <MemoryTab />}
        {tab === 'decision_trees' && <DecisionTreesTab />}
      </EuiPageTemplate.Section>
    </>
  );
}
