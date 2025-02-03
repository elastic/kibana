/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { appCategories, type CardNavExtensionDefinition } from '@kbn/management-cards-navigation';
import {
  getNavigationPropsFromId,
  SecurityPageName,
  ExternalPageName,
} from '@kbn/security-solution-navigation';
import { i18n } from '@kbn/i18n';
import type { Services } from '../common/services';

const SecurityManagementCards = new Map<string, CardNavExtensionDefinition['category']>([
  [ExternalPageName.visualize, 'content'],
  [ExternalPageName.maps, 'content'],
  [SecurityPageName.entityAnalyticsManagement, 'alerts'],
  [SecurityPageName.entityAnalyticsEntityStoreManagement, 'alerts'],
]);

export const enableManagementCardsLanding = (services: Services) => {
  const { securitySolution, management, application } = services;

  securitySolution.getNavLinks$().subscribe((navLinks) => {
    const cardNavDefinitions = navLinks.reduce<Record<string, CardNavExtensionDefinition>>(
      (acc, navLink) => {
        if (SecurityManagementCards.has(navLink.id)) {
          const { appId, deepLinkId, path } = getNavigationPropsFromId(navLink.id);

          acc[navLink.id] = {
            category: SecurityManagementCards.get(navLink.id) ?? 'other',
            title: navLink.title,
            description: navLink.description ?? '',
            icon: navLink.landingIcon ?? '',
            href: application.getUrlForApp(appId, { deepLinkId, path }),
            skipValidation: true,
          };
        }
        return acc;
      },
      {}
    );

    const securityAiAssistantManagement = getSecurityAiAssistantManagementDefinition(services);

    if (securityAiAssistantManagement) {
      cardNavDefinitions.securityAiAssistantManagement = securityAiAssistantManagement;
    }

    management.setupCardsNavigation({
      enabled: true,
      extendCardNavDefinitions: services.serverless.getNavigationCards(
        services.security.authz.isRoleManagementEnabled(),
        cardNavDefinitions
      ),
    });
  });
};

const getSecurityAiAssistantManagementDefinition = (services: Services) => {
  const { application } = services;
  const aiAssistantIsEnabled = application.capabilities.securitySolutionAssistant?.['ai-assistant'];

  if (aiAssistantIsEnabled) {
    return {
      category: appCategories.OTHER,
      title: i18n.translate(
        'xpack.securitySolutionServerless.securityAiAssistantManagement.app.title',
        {
          defaultMessage: 'AI assistant for Security settings',
        }
      ),
      description: i18n.translate(
        'xpack.securitySolutionServerless.securityAiAssistantManagement.app.description',
        {
          defaultMessage: 'Manage your AI assistant for Security settings.',
        }
      ),
      icon: 'sparkles',
    };
  }

  return null;
};
