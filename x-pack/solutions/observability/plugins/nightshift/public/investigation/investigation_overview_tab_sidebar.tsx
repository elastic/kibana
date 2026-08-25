/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ConversationTemplateTabRenderProps } from '@kbn/agent-builder-browser';
import type { NightshiftStartDependencies } from '../types';
import { InvestigationOverviewTab } from './investigation_overview_tab';

export type SidebarServices = CoreStart & NightshiftStartDependencies;

/**
 * Returns a React component that wraps InvestigationOverviewTab inside a KibanaContextProvider
 * so that useKibana() works when the tab is rendered in the Agent Builder sidebar — which does
 * not provide the Nightshift KibanaContextProvider.
 */
export function createSidebarInvestigationOverviewTab(
  services: SidebarServices
): React.FC<ConversationTemplateTabRenderProps> {
  const SidebarInvestigationOverviewTab: React.FC<ConversationTemplateTabRenderProps> = (props) => (
    <KibanaContextProvider services={services}>
      <InvestigationOverviewTab {...props} />
    </KibanaContextProvider>
  );
  SidebarInvestigationOverviewTab.displayName = 'SidebarInvestigationOverviewTab';
  return SidebarInvestigationOverviewTab;
}
