/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const i18nNamespaceKey = 'securitySolutionPackages.csp.graph.callout';

export type CalloutVariant =
  | 'missingAllRequirements'
  | 'uninstalledIntegration'
  | 'disabledEntityStore'
  | 'unavailableEntityInfo'
  | 'unknownEntityType';

export interface CalloutConfig {
  title: string;
  message: string;
  links: Array<{ text: string; href: string }>;
}

// Reusable i18n constants
const ENRICH_GRAPH_EXPERIENCE_TITLE = i18n.translate(`${i18nNamespaceKey}.enrichGraphExperience`, {
  defaultMessage: 'Enrich graph experience',
});

const INSTALL_CLOUD_ASSET_DISCOVERY_LINK = {
  text: i18n.translate(`${i18nNamespaceKey}.installCloudAssetDiscovery`, {
    defaultMessage: 'Install Cloud Asset Discovery',
  }),
  href: '#',
};

const ENABLE_ENTITY_STORE_LINK = {
  text: i18n.translate(`${i18nNamespaceKey}.enableEntityStore`, {
    defaultMessage: 'Enable Entity Store',
  }),
  href: '#',
};

const CALLOUT_CONFIG: Record<CalloutVariant, CalloutConfig> = {
  missingAllRequirements: {
    title: ENRICH_GRAPH_EXPERIENCE_TITLE,
    message: i18n.translate(`${i18nNamespaceKey}.missingAllRequirements.message`, {
      defaultMessage:
        'Installing the Cloud Asset Discovery integration and enabling Entity Store for a high fidelity graph investigation experience.',
    }),
    links: [INSTALL_CLOUD_ASSET_DISCOVERY_LINK, ENABLE_ENTITY_STORE_LINK],
  },
  uninstalledIntegration: {
    title: ENRICH_GRAPH_EXPERIENCE_TITLE,
    message: i18n.translate(`${i18nNamespaceKey}.uninstalledIntegration.message`, {
      defaultMessage:
        'Installing the Cloud Asset Discovery integration for a high fidelity graph investigation experience.',
    }),
    links: [INSTALL_CLOUD_ASSET_DISCOVERY_LINK],
  },
  disabledEntityStore: {
    title: ENRICH_GRAPH_EXPERIENCE_TITLE,
    message: i18n.translate(`${i18nNamespaceKey}.disabledEntityStore.message`, {
      defaultMessage: 'Enable Entity Store for a high fidelity graph investigation experience.',
    }),
    links: [ENABLE_ENTITY_STORE_LINK],
  },
  unavailableEntityInfo: {
    title: i18n.translate(`${i18nNamespaceKey}.unavailableEntityInfo.title`, {
      defaultMessage: 'Entity information unavailable',
    }),
    message: i18n.translate(`${i18nNamespaceKey}.unavailableEntityInfo.message`, {
      defaultMessage: 'Entity information could not be retrieved.',
    }),
    links: [
      {
        text: i18n.translate(`${i18nNamespaceKey}.unavailableEntityInfo.linkText`, {
          defaultMessage: 'Verify Cloud Asset Discovery Data',
        }),
        href: '#',
      },
    ],
  },
  unknownEntityType: {
    title: i18n.translate(`${i18nNamespaceKey}.unknownEntityType.title`, {
      defaultMessage: 'Unknown entity type',
    }),
    message: i18n.translate(`${i18nNamespaceKey}.unknownEntityType.message`, {
      defaultMessage: 'Verify entity fields to improve graph accuracy.',
    }),
    links: [
      {
        text: i18n.translate(`${i18nNamespaceKey}.unknownEntityType.linkText`, {
          defaultMessage: 'Verify Cloud Asset Discovery',
        }),
        href: '#',
      },
    ],
  },
};

/**
 * Get the callout configuration for a specific variant.
 * Consumers can use this to retrieve preset configurations with placeholder hrefs.
 * Override the hrefs with actual routes when using the configuration.
 *
 * @param variant - The callout variant to retrieve configuration for
 * @returns The callout configuration containing title, message, and links
 */
export const getCalloutConfig = (variant: CalloutVariant): CalloutConfig => {
  return CALLOUT_CONFIG[variant];
};
