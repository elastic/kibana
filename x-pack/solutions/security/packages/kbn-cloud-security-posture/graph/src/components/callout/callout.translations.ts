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

// Title translations
export const ENRICH_GRAPH_EXPERIENCE_TITLE = i18n.translate(
  `${i18nNamespaceKey}.enrichGraphExperience`,
  {
    defaultMessage: 'Enrich graph experience',
  }
);

export const UNAVAILABLE_ENTITY_INFO_TITLE = i18n.translate(
  `${i18nNamespaceKey}.unavailableEntityInfo.title`,
  {
    defaultMessage: 'Entity information unavailable',
  }
);

export const UNKNOWN_ENTITY_TYPE_TITLE = i18n.translate(
  `${i18nNamespaceKey}.unknownEntityType.title`,
  {
    defaultMessage: 'Unknown entity type',
  }
);

// Message translations
export const MISSING_ALL_REQUIREMENTS_MESSAGE = i18n.translate(
  `${i18nNamespaceKey}.missingAllRequirements.message`,
  {
    defaultMessage:
      'Install the Cloud Asset Discovery integration and enable Entity Store to enrich your graph visualization with entity metadata.',
  }
);

export const MISSING_INTEGRATION_MESSAGE = i18n.translate(
  `${i18nNamespaceKey}.missingIntegration.message`,
  {
    defaultMessage:
      'Install the Cloud Asset Discovery integration to enrich your graph visualization with entity metadata.',
  }
);

export const MISSING_ENTITY_STORE_MESSAGE = i18n.translate(
  `${i18nNamespaceKey}.missingEntityStore.message`,
  {
    defaultMessage: 'Enable Entity Store to enrich your graph visualization with entity metadata.',
  }
);

export const UNAVAILABLE_ENTITY_INFO_MESSAGE = i18n.translate(
  `${i18nNamespaceKey}.unavailableEntityInfo.message`,
  {
    defaultMessage: 'Entity information could not be retrieved.',
  }
);

export const UNKNOWN_ENTITY_TYPE_MESSAGE = i18n.translate(
  `${i18nNamespaceKey}.unknownEntityType.message`,
  {
    defaultMessage: 'Verify entity fields to improve graph accuracy.',
  }
);

// Link text translations
export const INSTALL_CLOUD_ASSET_DISCOVERY_TEXT = i18n.translate(
  `${i18nNamespaceKey}.installCloudAssetDiscovery`,
  {
    defaultMessage: 'Install Cloud Asset Discovery',
  }
);

export const ENABLE_ENTITY_STORE_TEXT = i18n.translate(`${i18nNamespaceKey}.enableEntityStore`, {
  defaultMessage: 'Enable Entity Store',
});

export const VERIFY_CLOUD_ASSET_DISCOVERY_DATA_TEXT = i18n.translate(
  `${i18nNamespaceKey}.verifyCloudAssetDiscoveryData`,
  {
    defaultMessage: 'Verify Cloud Asset Discovery data',
  }
);
