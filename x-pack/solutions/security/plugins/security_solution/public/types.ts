/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { CoreStart, AppMountParameters, AppLeaveHandler } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { DataPublicPluginStart, DataPublicPluginSetup } from '@kbn/data-plugin/public';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { NewsfeedPublicPluginStart } from '@kbn/newsfeed-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { PluginStart as ListsPluginStart } from '@kbn/lists-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CasesPublicStart, CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { TimelinesUIStart } from '@kbn/timelines-plugin/public';
import type { SessionViewStart } from '@kbn/session-view-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { OsqueryPluginStart } from '@kbn/osquery-plugin/public';
import type { LicensingPluginStart, LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { CloudDefendPluginStart } from '@kbn/cloud-defend-plugin/public';
import type { CspClientPluginStart } from '@kbn/cloud-security-posture-plugin/public';
import type { ApmBase } from '@elastic/apm-rum';
import type {
  SavedObjectsTaggingApi,
  SavedObjectTaggingOssPluginStart,
} from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ThreatIntelligencePluginStart } from '@kbn/threat-intelligence-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { PluginStartContract } from '@kbn/alerting-plugin/public/plugin';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { AutomaticImportPluginStart } from '@kbn/automatic-import-plugin/public';
import type { ResolverPluginSetup } from './resolver/types';
import type { Inspect } from '../common/search_strategy';
import type { Detections } from './detections';
import type { Cases } from './cases';
import type { Exceptions } from './exceptions';
import type { Onboarding } from './onboarding';
import type { Overview } from './overview';
import type { Rules } from './rules';
import type { Timelines } from './timelines';
import type { Management } from './management';
import type { CloudSecurityPosture } from './cloud_security_posture';
import type { CloudDefend } from './cloud_defend';
import type { ThreatIntelligence } from './threat_intelligence';
import type { SecuritySolutionTemplateWrapper } from './app/home/template_wrapper';
import type { AssetInventory } from './asset_inventory';
import type { AttackDiscovery } from './attack_discovery';
import type { Explore } from './explore';
import type { NavigationLink } from './common/links';
import type { EntityAnalytics } from './entity_analytics';
import type { Assets } from './assets';
import type { Investigations } from './investigations';
import type { MachineLearning } from './machine_learning';
import type { SiemMigrations } from './siem_migrations';

import type { Dashboards } from './dashboards';
import type { BreadcrumbsNav } from './common/breadcrumbs/types';
import type { TopValuesPopoverService } from './app/components/top_values_popover/top_values_popover_service';
import type { ExperimentalFeatures } from '../common/experimental_features';
import type { SetComponents, GetComponents$ } from './contract_components';
import type { ConfigSettings } from '../common/config_settings';
import type { OnboardingService } from './onboarding/service';
import type { SolutionNavigation } from './app/solution_navigation/solution_navigation';
import type { TelemetryServiceStart } from './common/lib/telemetry';
import type { SiemMigrationsService } from './siem_migrations/service';

export interface SetupPlugins {
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  management: ManagementSetup;
  security: SecurityPluginSetup;
  triggersActionsUi: TriggersActionsSetup;
  usageCollection?: UsageCollectionSetup;
  ml?: MlPluginSetup;
  cases?: CasesPublicSetup;
  data: DataPublicPluginSetup;
  discoverShared: DiscoverSharedPublicStart;
}

/**
 * IMPORTANT - PLEASE READ: When adding new plugins to the
 * security solution, please ensure you add that plugin
 * name to the kibana.jsonc file located in ../kibana.jsonc
 *
 * Without adding the plugin name there, the plugin will not
 * fulfill at runtime, despite the types showing up correctly
 * in the code.
 */
export interface StartPlugins {
  cases: CasesPublicStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dashboard?: DashboardStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  fleet?: FleetStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  lens: LensPublicStart;
  lists?: ListsPluginStart;
  licensing: LicensingPluginStart;
  newsfeed?: NewsfeedPublicPluginStart;
  triggersActionsUi: TriggersActionsStart;
  timelines: TimelinesUIStart;
  sessionView: SessionViewStart;
  uiActions: UiActionsStart;
  maps: MapsStartApi;
  ml?: MlPluginStart;
  spaces: SpacesPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  osquery: OsqueryPluginStart;
  security: SecurityPluginStart;
  cloud?: CloudStart;
  cloudDefend: CloudDefendPluginStart;
  cloudSecurityPosture: CspClientPluginStart;
  threatIntelligence: ThreatIntelligencePluginStart;
  dataViews: DataViewsServicePublic;
  fieldFormats: FieldFormatsStartCommon;
  discover: DiscoverStart;
  navigation: NavigationPublicPluginStart;
  expressions: ExpressionsStart;
  dataViewEditor: DataViewEditorStart;
  charts: ChartsPluginStart;
  savedSearch: SavedSearchPublicPluginStart;
  alerting: PluginStartContract;
  core: CoreStart;
  automaticImport?: AutomaticImportPluginStart;
  serverless?: ServerlessPluginStart;
  productDocBase: ProductDocBasePluginStart;
}

export interface StartPluginsDependencies extends StartPlugins {
  contentManagement: ContentManagementPublicStart;
  savedObjectsTaggingOss: SavedObjectTaggingOssPluginStart;
}

export interface ContractStartServices {
  getComponents$: GetComponents$;
  upselling: UpsellingService;
  onboarding: OnboardingService;
}

export type StartServices = CoreStart &
  StartPlugins &
  ContractStartServices & {
    configSettings: ConfigSettings;
    storage: Storage;
    sessionStorage: Storage;
    apm: ApmBase;
    savedObjectsTagging?: SavedObjectsTaggingApi;
    setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
    onAppLeave?: (handler: AppLeaveHandler) => void;

    /**
     * This component will be exposed to all lazy loaded plugins, via useKibana hook. It should wrap every plugin route.
     * The goal is to allow page property customization (such as `template`).
     */
    securityLayout: {
      getPluginWrapper: () => typeof SecuritySolutionTemplateWrapper;
    };
    contentManagement: ContentManagementPublicStart;
    telemetry: TelemetryServiceStart;
    customDataService: DataPublicPluginStart;
    topValuesPopover: TopValuesPopoverService;
    timelineDataService: DataPublicPluginStart;
    siemMigrations: SiemMigrationsService;
    productDocBase: ProductDocBasePluginStart;
  };

export type StartRenderServices = Pick<
  CoreStart,
  // Used extensively in rendering Security Solution UI
  | 'notifications'
  // Needed for rendering Shared React modules
  | 'analytics'
  | 'i18n'
  | 'theme'
>;

export interface PluginSetup {
  resolver: () => Promise<ResolverPluginSetup>;
  experimentalFeatures: ExperimentalFeatures;
}

export interface PluginStart {
  getNavLinks$: () => Observable<NavigationLink[]>;
  setComponents: SetComponents;
  getBreadcrumbsNav$: () => Observable<BreadcrumbsNav>;
  getUpselling: () => UpsellingService;
  setOnboardingSettings: OnboardingService['setSettings'];
  setIsSolutionNavigationEnabled: (isSolutionNavigationEnabled: boolean) => void;
  getSolutionNavigation: () => Promise<SolutionNavigation>;
}

export type InspectResponse = Inspect & { response: string[] };

export const CASES_SUB_PLUGIN_KEY = 'cases';

export interface SubPlugins {
  [CASES_SUB_PLUGIN_KEY]: Cases;
  alerts: Detections;
  assetInventory: AssetInventory;
  attackDiscovery: AttackDiscovery;
  cloudDefend: CloudDefend;
  cloudSecurityPosture: CloudSecurityPosture;
  dashboards: Dashboards;
  exceptions: Exceptions;
  explore: Explore;
  management: Management;
  onboarding: Onboarding;
  overview: Overview;
  rules: Rules;
  threatIntelligence: ThreatIntelligence;
  timelines: Timelines;
  entityAnalytics: EntityAnalytics;
  assets: Assets;
  investigations: Investigations;
  machineLearning: MachineLearning;
  siemMigrations: SiemMigrations;
}

// TODO: find a better way to defined these types
export interface StartedSubPlugins {
  [CASES_SUB_PLUGIN_KEY]: ReturnType<Cases['start']>;
  alerts: Awaited<ReturnType<Detections['start']>>;
  assetInventory: Awaited<ReturnType<AssetInventory['start']>>;
  attackDiscovery: ReturnType<AttackDiscovery['start']>;
  cloudDefend: ReturnType<CloudDefend['start']>;
  cloudSecurityPosture: ReturnType<CloudSecurityPosture['start']>;
  dashboards: ReturnType<Dashboards['start']>;
  exceptions: ReturnType<Exceptions['start']>;
  explore: ReturnType<Explore['start']>;
  management: ReturnType<Management['start']>;
  onboarding: ReturnType<Onboarding['start']>;
  overview: ReturnType<Overview['start']>;
  rules: ReturnType<Rules['start']>;
  threatIntelligence: ReturnType<ThreatIntelligence['start']>;
  timelines: ReturnType<Timelines['start']>;
  entityAnalytics: ReturnType<EntityAnalytics['start']>;
  assets: ReturnType<Assets['start']>;
  investigations: ReturnType<Investigations['start']>;
  machineLearning: ReturnType<MachineLearning['start']>;
  siemMigrations: ReturnType<SiemMigrations['start']>;
}
