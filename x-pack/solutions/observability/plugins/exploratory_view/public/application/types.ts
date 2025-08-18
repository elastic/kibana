/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceStart,
  ApplicationStart,
  ChromeStart,
  DocLinksStart,
  HttpStart,
  I18nStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';

export interface ObservabilityAppServices {
  application: ApplicationStart;
  cases: CasesPublicStart;
  charts: ChartsPluginStart;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  lens: LensPublicStart;
  navigation: NavigationPublicPluginStart;
  notifications: NotificationsStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  overlays: OverlayStart;
  share: SharePluginStart;
  stateTransfer: EmbeddableStateTransfer;
  storage: IStorageWrapper;
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiSettings: IUiSettingsClient;
  isDev?: boolean;
  kibanaVersion: string;
}
