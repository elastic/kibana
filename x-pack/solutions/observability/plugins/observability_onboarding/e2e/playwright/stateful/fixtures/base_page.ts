/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@playwright/test';
import { HeaderBar } from '../pom/components/header_bar.component';
import { OnboardingHomePage } from '../pom/pages/onboarding_home.page';
import { SpaceSelector } from '../pom/components/space_selector.component';
import { KubernetesOverviewDashboardPage } from '../pom/pages/kubernetes_overview_dashboard.page';
import { AutoDetectFlowPage } from '../pom/pages/auto_detect_flow.page';
import { KubernetesEAFlowPage } from '../pom/pages/kubernetes_ea_flow.page';
import { OtelKubernetesFlowPage } from '../pom/pages/otel_kubernetes_flow.page';
import { OtelKubernetesOverviewDashboardPage } from '../pom/pages/otel_kubernetes_overview_dashboard.page';

export const test = base.extend<{
  headerBar: HeaderBar;
  spaceSelector: SpaceSelector;
  onboardingHomePage: OnboardingHomePage;
  autoDetectFlowPage: AutoDetectFlowPage;
  kubernetesEAFlowPage: KubernetesEAFlowPage;
  otelKubernetesFlowPage: OtelKubernetesFlowPage;
  kubernetesOverviewDashboardPage: KubernetesOverviewDashboardPage;
  otelKubernetesOverviewDashboardPage: OtelKubernetesOverviewDashboardPage;
}>({
  headerBar: async ({ page }, use) => {
    await use(new HeaderBar(page));
  },

  spaceSelector: async ({ page }, use) => {
    await use(new SpaceSelector(page));
  },

  onboardingHomePage: async ({ page }, use) => {
    await use(new OnboardingHomePage(page));
  },

  autoDetectFlowPage: async ({ page }, use) => {
    await use(new AutoDetectFlowPage(page));
  },

  kubernetesEAFlowPage: async ({ page }, use) => {
    await use(new KubernetesEAFlowPage(page));
  },

  otelKubernetesFlowPage: async ({ page }, use) => {
    await use(new OtelKubernetesFlowPage(page));
  },

  kubernetesOverviewDashboardPage: async ({ page }, use) => {
    await use(new KubernetesOverviewDashboardPage(page));
  },

  otelKubernetesOverviewDashboardPage: async ({ page }, use) => {
    await use(new OtelKubernetesOverviewDashboardPage(page));
  },
});
