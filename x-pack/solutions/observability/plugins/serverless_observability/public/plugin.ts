/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { appCategories, appIds } from '@kbn/management-cards-navigation';
import type { Subscription } from 'rxjs';
import { combineLatest, distinctUntilChanged, map, of, merge, fromEvent } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { createNavigationTree } from './navigation_tree';
import type {
  ServerlessObservabilityPublicSetup,
  ServerlessObservabilityPublicStart,
  ServerlessObservabilityPublicSetupDependencies,
  ServerlessObservabilityPublicStartDependencies,
} from './types';

export class ServerlessObservabilityPlugin
  implements
    Plugin<
      ServerlessObservabilityPublicSetup,
      ServerlessObservabilityPublicStart,
      ServerlessObservabilityPublicSetupDependencies,
      ServerlessObservabilityPublicStartDependencies
    >
{
  private managementCardsSubscription?: Subscription;

  public setup(
    _core: CoreSetup<
      ServerlessObservabilityPublicStartDependencies,
      ServerlessObservabilityPublicStart
    >,
    _setupDeps: ServerlessObservabilityPublicSetupDependencies
  ): ServerlessObservabilityPublicSetup {
    return {};
  }

  public start(
    core: CoreStart,
    setupDeps: ServerlessObservabilityPublicStartDependencies
  ): ServerlessObservabilityPublicStart {
    const { serverless, management, security } = setupDeps;

    const chatExperience$ = core.settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);

    const INGEST_HUB_VERSION_KEY = 'ingestHub:activeVersion';
    const getIngestHubVersion = () => {
      try {
        return typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem(INGEST_HUB_VERSION_KEY)
          : null;
      } catch {
        return null;
      }
    };
    const ingestHubVersion$ =
      typeof window === 'undefined'
        ? of(getIngestHubVersion())
        : merge(
            of(getIngestHubVersion()),
            fromEvent<CustomEvent<string>>(window, 'ingestHubVersionChange').pipe(
              map((e) => e.detail)
            )
          );

    const navigationTree$ = combineLatest([
      setupDeps.streams?.navigationStatus$ || of({ status: 'disabled' as const }),
      chatExperience$,
      ingestHubVersion$,
    ]).pipe(
      map(([streamsStatus, chatExperience, ingestHubVersion]) => {
        return createNavigationTree({
          streamsAvailable: streamsStatus.status === 'enabled',
          overviewAvailable: core.pricing.isFeatureAvailable('observability:complete_overview'),
          isCasesAvailable: Boolean(setupDeps.cases),
          showAiAssistant: chatExperience !== AIChatExperience.Agent,
          hideIngestHubDataManagement: ingestHubVersion === 'skipUx',
        });
      })
    );
    serverless.setProjectHome('/app/observability/landing');
    serverless.initNavigation('oblt', navigationTree$, { dataTestSubj: 'svlObservabilitySideNav' });

    const aiAssistantIsEnabled = core.application.capabilities.observabilityAIAssistant?.show;
    const roleManagementEnabled = security.authz.isRoleManagementEnabled();

    this.managementCardsSubscription = chatExperience$
      .pipe(
        map(
          (chatExperience) =>
            Boolean(aiAssistantIsEnabled) && chatExperience !== AIChatExperience.Agent
        ),
        distinctUntilChanged(),
        map((showAiAssistant) =>
          serverless.getNavigationCards(
            roleManagementEnabled,
            showAiAssistant
              ? {
                  observabilityAiAssistantManagement: {
                    category: appCategories.OTHER,
                    title: i18n.translate(
                      'xpack.serverlessObservability.aiAssistantManagementTitle',
                      {
                        defaultMessage: 'AI Assistant Settings',
                      }
                    ),
                    description: i18n.translate(
                      'xpack.serverlessObservability.aiAssistantManagementDescription',
                      {
                        defaultMessage:
                          'Manage knowledge base and control assistant behavior, including response language.',
                      }
                    ),
                    icon: 'sparkles',
                  },
                }
              : undefined
          )
        )
      )
      .subscribe((extendCardNavDefinitions) => {
        management.setupCardsNavigation({
          enabled: true,
          hideLinksTo: [appIds.RULES],
          extendCardNavDefinitions,
        });
      });

    return {};
  }

  public stop() {
    this.managementCardsSubscription?.unsubscribe();
  }
}
