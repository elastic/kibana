/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CalloutVariant, CalloutConfig } from './callout.translations';
import {
  ENRICH_GRAPH_EXPERIENCE_TITLE,
  UNAVAILABLE_ENTITY_INFO_TITLE,
  UNKNOWN_ENTITY_TYPE_TITLE,
  MISSING_INTEGRATION_MESSAGE,
  UNAVAILABLE_ENTITY_INFO_MESSAGE,
  UNKNOWN_ENTITY_TYPE_MESSAGE,
  INSTALL_CLOUD_ASSET_DISCOVERY_TEXT,
  VERIFY_CLOUD_ASSET_DISCOVERY_DATA_TEXT,
} from './callout.translations';

/**
 * Get the callout configuration for a specific variant with provided URLs.
 *
 * @param variant - The callout variant to retrieve configuration for
 * @param links - Object containing URLs for integration and discover
 * @returns The callout configuration
 */
export const getCalloutConfig = (
  variant: CalloutVariant,
  links: {
    integrationUrl: string;
    discoverUrl: string;
  }
): CalloutConfig => {
  const { integrationUrl, discoverUrl } = links;

  // Build complete CalloutConfig objects based on variant
  switch (variant) {
    case 'uninstalledIntegration':
      return {
        title: ENRICH_GRAPH_EXPERIENCE_TITLE,
        message: MISSING_INTEGRATION_MESSAGE,
        links: [
          {
            text: INSTALL_CLOUD_ASSET_DISCOVERY_TEXT,
            href: integrationUrl,
          },
        ],
      };

    case 'unavailableEntityInfo':
      return {
        title: UNAVAILABLE_ENTITY_INFO_TITLE,
        message: UNAVAILABLE_ENTITY_INFO_MESSAGE,
        links: [
          {
            text: VERIFY_CLOUD_ASSET_DISCOVERY_DATA_TEXT,
            href: discoverUrl,
          },
        ],
      };

    case 'unknownEntityType':
      return {
        title: UNKNOWN_ENTITY_TYPE_TITLE,
        message: UNKNOWN_ENTITY_TYPE_MESSAGE,
        links: [
          {
            text: VERIFY_CLOUD_ASSET_DISCOVERY_DATA_TEXT,
            href: discoverUrl,
          },
        ],
      };
  }
};
