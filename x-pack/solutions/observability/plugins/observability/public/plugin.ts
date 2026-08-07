/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicStart, CasesPublicSetup } from '@kbn/cases-plugin/public';
import { CasesDeepLinkId, getCasesDeepLinks } from '@kbn/cases-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type {
  IUiSettingsClient,
  App,
  AppDeepLink,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin as PluginClass,
  PluginInitializerContext,
  ToastsStart,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DISCOVER_APP_LOCATOR, type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type {
  NavigationEntry,
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';

import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import {
  type TriggersAndActionsUIPublicPluginSetup,
  type TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { BehaviorSubject, from, map, mergeMap, switchMap } from 'rxjs';

import type { AiopsPluginStart } from '@kbn/aiops-plugin/public/types';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { ExploratoryViewPublicStart } from '@kbn/exploratory-view-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { StreamsPluginStart, StreamsPluginSetup } from '@kbn/streams-plugin/public';
import type { IngestHubStart } from '@kbn/ingest-hub-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ObservabilityAgentBuilderPluginPublicStart } from '@kbn/observability-agent-builder-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public/types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { observabilityAppId, observabilityFeatureId } from '../common';
import { getObservabilityAlertType } from './cases/attachments/alert';
import {
  ALERTS_PATH,
  ALERTS_INBOX_PATH,
  ALERTING_RULES_HUB_PATH,
  RULES_LIBRARY_PATH,
  SLO_MANAGE_REDIRECT_PATH,
  SLO_SETTINGS_REDIRECT_PATH,
  CASES_PATH,
  OBSERVABILITY_BASE_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
} from '../common/locators/paths';
import { registerDataHandler } from './context/has_data_context/data_handler';
import { createUseRulesLink } from './hooks/create_use_rules_link';
import type { ObservabilityRuleTypeRegistry } from './rules/create_observability_rule_type_registry';
import { createObservabilityRuleTypeRegistry } from './rules/create_observability_rule_type_registry';
import { registerObservabilityRuleTypes } from './rules/register_observability_rule_types';
import {
  CaseDetailsLocatorDefinition,
  CasesOverviewLocatorDefinition,
} from '../common/locators/cases';
import { TelemetryService } from './services/telemetry/telemetry_service';

export interface ConfigSchema {
  unsafe: {
    alertDetails: {
      logs?: {
        enabled: boolean;
      };
      uptime: {
        enabled: boolean;
      };
      observability?: {
        enabled: boolean;
      };
    };
    thresholdRule?: {
      enabled: boolean;
    };
    ruleFormV2?: {
      enabled: boolean;
    };
  };
  managedOtlpServiceUrl: string;
}
export type ObservabilityPublicSetup = ReturnType<Plugin['setup']>;
export interface ObservabilityPublicPluginsSetup {
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
  share: SharePluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  home?: HomePublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
  licensing: LicensingPluginSetup;
  serverless?: ServerlessPluginSetup;
  presentationUtil?: PresentationUtilPluginStart;
  streams?: StreamsPluginSetup;
  cases?: CasesPublicSetup;
  globalSearch?: GlobalSearchPluginSetup;
}
export interface ObservabilityPublicPluginsStart {
  actionTypeRegistry: ActionTypeRegistryContract;
  cases?: CasesPublicStart;
  charts: ChartsPluginStart;
  contentManagement: ContentManagementPublicStart;
  dashboard: DashboardStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  exploratoryView?: ExploratoryViewPublicStart;
  expressions: ExpressionsStart;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  licenseManagement?: LicenseManagementUIPluginSetup;
  logsDataAccess: LogsDataAccessPluginStart;
  navigation: NavigationPublicPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
  security: SecurityPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  kql: KqlPluginStart;
  home?: HomePublicPluginStart;
  cloud?: CloudStart;
  aiops: AiopsPluginStart;
  serverless?: ServerlessPluginStart;
  uiSettings: IUiSettingsClient;
  uiActions: UiActionsStart;
  presentationUtil?: PresentationUtilPluginStart;
  theme: CoreStart['theme'];
  dataViewFieldEditor: DataViewFieldEditorStart;
  toastNotifications: ToastsStart;
  streams: StreamsPluginStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  inspector: InspectorPluginStart;
  savedObjectsTagging: SavedObjectTaggingPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  observabilityAgentBuilder?: ObservabilityAgentBuilderPluginPublicStart;
  cps?: CPSPluginStart;
  ingestHub?: IngestHubStart;
  alertingVTwo?: AlertingV2PublicStart;
}
export type ObservabilityPublicStart = ReturnType<Plugin['start']>;

export class Plugin
  implements
    PluginClass<
      ObservabilityPublicSetup,
      ObservabilityPublicStart,
      ObservabilityPublicPluginsSetup,
      ObservabilityPublicPluginsStart
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry =
    {} as ObservabilityRuleTypeRegistry;
  private telemetry: TelemetryService;

  // Define deep links as constant and hidden. Whether they are shown or hidden
  // in the global navigation will happen in `updateGlobalNavigation`.
  private readonly deepLinks: AppDeepLink[] = [
    {
      id: 'alerts_inbox',
      title: i18n.translate('xpack.observability.alertsInboxLinkTitle', {
        defaultMessage: 'Inbox',
      }),
      order: 8001,
      path: ALERTS_INBOX_PATH,
      visibleIn: ['projectSideNav'],
      keywords: ['alerts', 'inbox', 'episodes'],
    },
    {
      id: 'alerts',
      title: i18n.translate('xpack.observability.alertsLinkTitle', {
        defaultMessage: 'Alerts',
      }),
      order: 8002,
      path: ALERTS_PATH,
      visibleIn: ['projectSideNav'],
      keywords: ['alerts', 'rules'],
    },
    {
      id: 'alerting_rules_hub',
      title: i18n.translate('xpack.observability.alertingRulesHubLinkTitle', {
        defaultMessage: 'Rules',
      }),
      order: 8003,
      path: ALERTING_RULES_HUB_PATH,
      visibleIn: ['projectSideNav'],
      keywords: ['alerts', 'rules'],
    },
    {
      id: 'rules_library',
      title: i18n.translate('xpack.observability.rulesLibraryLinkTitle', {
        defaultMessage: 'Rules Library',
      }),
      path: RULES_LIBRARY_PATH,
      visibleIn: ['projectSideNav'],
      keywords: ['alerts', 'rules', 'library'],
    },
    {
      id: 'slo_manage',
      title: i18n.translate('xpack.observability.sloManageLinkTitle', {
        defaultMessage: 'Manage SLOs',
      }),
      path: SLO_MANAGE_REDIRECT_PATH,
      visibleIn: ['projectSideNav'],
      keywords: ['slo', 'slos'],
    },
    {
      id: 'slo_settings',
      title: i18n.translate('xpack.observability.sloSettingsLinkTitle', {
        defaultMessage: 'Settings',
      }),
      path: SLO_SETTINGS_REDIRECT_PATH,
      visibleIn: ['projectSideNav'],
      keywords: ['slo', 'slos', 'settings'],
    },
  ];

  constructor(private readonly initContext: PluginInitializerContext<ConfigSchema>) {
    this.telemetry = new TelemetryService();
  }

  private canUseHistory = (history: AppMountParameters<unknown>['history']) => {
    try {
      history.createHref(history.location, { prependBasePath: false });
      return true;
    } catch {
      return false;
    }
  };

  public setup(
    coreSetup: CoreSetup<ObservabilityPublicPluginsStart, ObservabilityPublicStart>,
    pluginsSetup: ObservabilityPublicPluginsSetup
  ) {
    if (pluginsSetup.cases) {
      this.deepLinks.push(
        getCasesDeepLinks({
          basePath: CASES_PATH,
          extend: {
            [CasesDeepLinkId.cases]: {
              order: 8005,
              visibleIn: ['projectSideNav'],
            },
            [CasesDeepLinkId.casesCreate]: {
              visibleIn: ['projectSideNav'],
            },
            [CasesDeepLinkId.casesConfigure]: {
              visibleIn: ['projectSideNav'],
            },
          },
        })
      );
      pluginsSetup.cases.attachmentFramework.registerUnified(getObservabilityAlertType());
    }
    const category = DEFAULT_APP_CATEGORIES.observability;
    const euiIconType = 'logoObservability';
    const config = this.initContext.config.get();
    const kibanaVersion = this.initContext.env.packageInfo.version;
    this.telemetry.setup(coreSetup.analytics);

    this.observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistry(
      pluginsSetup.triggersActionsUi.ruleTypeRegistry
    );

    pluginsSetup.share.url.locators.create(CaseDetailsLocatorDefinition());
    pluginsSetup.share.url.locators.create(CasesOverviewLocatorDefinition());

    const logsLocator =
      pluginsSetup.share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

    const mount = async (params: AppMountParameters<unknown>) => {
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();

      const { pathname, search } = params.history.location;

      // Exact `/alerts/rules` or `/alerts/rules/...` only — do not match
      // `/alerts/rules-hub` or `/alerts/rules-library` (startsWith(RULES_PATH) would).
      const isLegacyRulesPath =
        pathname === RULES_PATH || pathname.startsWith(`${RULES_PATH}/`);
      if (isLegacyRulesPath) {
        let suffix = pathname.slice(RULES_PATH.length) || '/';
        const isTopLevelRoute =
          suffix === '/' || suffix === '/logs' || suffix.startsWith('/create');
        if (!isTopLevelRoute) {
          suffix = `/rule${suffix}`;
        }
        await coreStart.application.navigateToApp('rules', {
          path: suffix + search,
          replace: true,
        });
        return () => {};
      }

      const { renderApp } = await import('./application');
      const { ruleTypeRegistry, actionTypeRegistry } = pluginsStart.triggersActionsUi;

      if (!this.canUseHistory(params.history)) {
        return () => {};
      }

      return renderApp({
        appMountParameters: params,
        config,
        core: coreStart,
        isDev: this.initContext.env.mode.dev,
        kibanaVersion,
        observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
        ObservabilityPageTemplate: pluginsStart.observabilityShared.navigation.PageTemplate,
        telemetryClient: this.telemetry.start(coreStart.analytics),
        plugins: {
          ...pluginsStart,
          ruleTypeRegistry,
          actionTypeRegistry,
        },
        usageCollection: pluginsSetup.usageCollection,
        isServerless: !!pluginsStart.serverless,
      });
    };

    const appUpdater$ = this.appUpdater$;

    const app: App = {
      appRoute: OBSERVABILITY_BASE_PATH,
      category,
      deepLinks: this.deepLinks,
      euiIconType,
      id: observabilityAppId,
      mount,
      order: 8000,
      title: i18n.translate('xpack.observability.overviewLinkTitle', {
        defaultMessage: 'Overview',
      }),
      updater$: appUpdater$,
      keywords: [
        'observability',
        'monitor',
        'logs',
        'metrics',
        'apm',
        'performance',
        'trace',
        'agent',
        'rum',
        'user',
        'experience',
      ],
      visibleIn: Boolean(pluginsSetup.serverless)
        ? ['projectSideNav', 'home', 'kibanaOverview']
        : ['globalSearch', 'classicSideNav', 'projectSideNav', 'home', 'kibanaOverview'],
    };

    coreSetup.application.register(app);

    registerObservabilityRuleTypes(
      this.observabilityRuleTypeRegistry,
      coreSetup.uiSettings,
      coreSetup.getStartServices,
      logsLocator
    );

    if (pluginsSetup.home) {
      pluginsSetup.home.featureCatalogue.registerSolution({
        id: observabilityFeatureId,
        title: i18n.translate('xpack.observability.featureCatalogueTitle', {
          defaultMessage: 'Observability',
        }),
        description: i18n.translate('xpack.observability.featureCatalogueDescription', {
          defaultMessage:
            'Consolidate your logs, metrics, application traces, and system availability with purpose-built UIs.',
        }),
        icon: 'logoObservability',
        path: `${OBSERVABILITY_BASE_PATH}/`,
        order: 200,
        isVisible: (capabilities) => {
          const obs = capabilities.catalogue[observabilityFeatureId];
          const uptime = capabilities.catalogue.uptime;
          const infra = capabilities.catalogue.infra;
          const apm = capabilities.catalogue.apm;

          return obs || uptime || infra || apm;
        },
      });
    }

    pluginsSetup.observabilityShared.navigation.registerSections(
      from(appUpdater$).pipe(
        mergeMap((value) =>
          from(coreSetup.getStartServices()).pipe(
            switchMap(([coreStart, pluginsStart]) => {
              const deepLinks = value(app)?.deepLinks ?? [];

              const overviewLink = !Boolean(pluginsSetup.serverless)
                ? [
                    {
                      label: i18n.translate('xpack.observability.overviewLinkTitle', {
                        defaultMessage: 'Overview',
                      }),
                      app: observabilityAppId,
                      path: OVERVIEW_PATH,
                    },
                  ]
                : [];

              const isAiAssistantEnabled =
                pluginsStart.observabilityAIAssistant?.service.isEnabled();

              const chatExperience$ =
                coreStart.settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);

              return chatExperience$.pipe(
                switchMap((chatExperience) =>
                  pluginsStart.streams.navigationStatus$.pipe(
                    map(({ status: streamsStatus }) => {
                      const showAiAssistant = chatExperience !== AIChatExperience.Agent;

                      const aiAssistantLink =
                        isAiAssistantEnabled &&
                        !Boolean(pluginsSetup.serverless) &&
                        Boolean(pluginsSetup.observabilityAIAssistant) &&
                        showAiAssistant
                          ? [
                              {
                                label: i18n.translate('xpack.observability.aiAssistantLinkTitle', {
                                  defaultMessage: 'AI Assistant',
                                }),
                                app: 'observabilityAIAssistant',
                                path: '/conversations/new',
                              },
                            ]
                          : [];

                      const streamsLink =
                        streamsStatus === 'enabled'
                          ? [
                              {
                                label: i18n.translate('xpack.observability.streamsAppLinkTitle', {
                                  defaultMessage: 'Streams',
                                }),
                                app: 'streams',
                                path: '/',
                                matchPath(currentPath: string) {
                                  return ['/', ''].some((testPath) =>
                                    currentPath.startsWith(testPath)
                                  );
                                },
                              },
                            ]
                          : [];

                      const sloLink = coreStart.application.capabilities.slo?.read
                        ? [
                            {
                              label: i18n.translate('xpack.observability.sloLinkTitle', {
                                defaultMessage: 'SLOs',
                              }),
                              app: 'slo',
                              path: '',
                            },
                          ]
                        : [];

                      // Reformat visible deep links to NavigationEntry objects for PageTemplate.
                      // See https://github.com/elastic/kibana/issues/103325.
                      const otherLinks = deepLinks.filter(
                        (link) => (link.visibleIn ?? []).length > 0
                      );

                      const toObsEntry = (link: (typeof otherLinks)[number]) => ({
                        app: observabilityAppId,
                        label: link.title,
                        path: link.path ?? '',
                      });

                      const casesLink: NavigationEntry[] = otherLinks
                        .filter((link) => link.id === 'cases' && pluginsStart.cases)
                        .map(toObsEntry);

                      // Classic PageTemplate: Alerts section = Inbox, Alerts, Rules, SLOs.
                      // Chrome category shows only Alerts→Inbox + SLOs (via deep link visibility).
                      // Action policies / Maintenance windows stay under Stack Management only.
                      // Hardcode labels so alerts_inbox chrome title override ("Alerts") does not
                      // rename the Inbox row here.
                      const hasAlertsAccess = otherLinks.some(
                        (link) =>
                          link.id === 'alerts_inbox' ||
                          link.id === 'alerts' ||
                          link.id === 'alerting_rules_hub'
                      );
                      const alertsSectionEntries: NavigationEntry[] = [
                        ...(hasAlertsAccess
                          ? [
                              {
                                app: observabilityAppId,
                                label: i18n.translate('xpack.observability.alertsInboxLinkTitle', {
                                  defaultMessage: 'Inbox',
                                }),
                                path: ALERTS_INBOX_PATH,
                              },
                              {
                                app: observabilityAppId,
                                label: i18n.translate('xpack.observability.alertsLinkTitle', {
                                  defaultMessage: 'Alerts',
                                }),
                                path: ALERTS_PATH,
                                // `/alerts` is a prefix of `/alerts/rules-hub`, `/alerts/inbox`, etc.
                                // Only select the classic Alerts list (and /alerts/:alertId details).
                                matchPath: (path: string) => {
                                  if (path === ALERTS_PATH || path === `${ALERTS_PATH}/`) {
                                    return true;
                                  }
                                  const nested = path.match(/^\/alerts\/([^/?#]+)/);
                                  if (!nested) {
                                    return false;
                                  }
                                  const reserved = new Set([
                                    'inbox',
                                    'rules-hub',
                                    'rules-library',
                                    'rules',
                                    'slos',
                                  ]);
                                  return !reserved.has(nested[1]);
                                },
                              },
                              {
                                app: observabilityAppId,
                                label: i18n.translate(
                                  'xpack.observability.alertingRulesHubLinkTitle',
                                  {
                                    defaultMessage: 'Rules',
                                  }
                                ),
                                path: ALERTING_RULES_HUB_PATH,
                                matchPath: (path: string) =>
                                  path === ALERTING_RULES_HUB_PATH ||
                                  path.startsWith(`${ALERTING_RULES_HUB_PATH}/`) ||
                                  // Classic (v1) rules list + rule details under /alerts/rules
                                  path === RULES_PATH ||
                                  path.startsWith(`${RULES_PATH}/`),
                              },
                            ]
                          : []),
                        ...sloLink,
                      ];

                      return [
                        {
                          label: '',
                          sortKey: 100,
                          entries: [
                            ...overviewLink,
                            ...casesLink,
                            ...streamsLink,
                            ...aiAssistantLink,
                          ],
                        },
                        ...(alertsSectionEntries.length
                          ? [
                              {
                                label: i18n.translate(
                                  'xpack.observability.navigation.alertsSectionLabel',
                                  {
                                    defaultMessage: 'Alerts',
                                  }
                                ),
                                sortKey: 105,
                                entries: alertsSectionEntries,
                              },
                            ]
                          : []),
                      ];
                    })
                  )
                )
              );
            })
          )
        )
      )
    );

    return {
      dashboard: { register: registerDataHandler },
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      useRulesLink: createUseRulesLink(),
      config,
    };
  }

  public start(coreStart: CoreStart, pluginsStart: ObservabilityPublicPluginsStart) {
    const { application } = coreStart;
    const config = this.initContext.config.get();
    pluginsStart.observabilityShared.updateGlobalNavigation({
      capabilities: application.capabilities,
      deepLinks: this.deepLinks,
      updater$: this.appUpdater$,
      pricing: coreStart.pricing,
    });

    import('./navigation_tree').then(({ createDefinition }) => {
      return pluginsStart.navigation.addSolutionNavigation(
        createDefinition(coreStart, pluginsStart)
      );
    });

    // POC: start Alerting IA tour whenever solution Obs chrome is active
    // (not only when the Observability app is mounted).
    import('./pages/alerting_ia/alerting_ia_tour').then(({ initAlertingIaTour }) => {
      initAlertingIaTour(coreStart);
    });

    return {
      config,
      observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
      useRulesLink: createUseRulesLink(),
    };
  }
}
