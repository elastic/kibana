/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SupportedLogo } from '../../shared/logo_icon';

export interface MiniIntegrationTileDefinition {
  id: string;
  title: string;
  logo: SupportedLogo;
}

export const MINI_INTEGRATION_TILES: readonly MiniIntegrationTileDefinition[] = [
  {
    id: 'confluence',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.confluence.title',
      { defaultMessage: 'Confluence' }
    ),
    logo: 'confluence',
  },
  {
    id: 'salesforce',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.salesforce.title',
      { defaultMessage: 'Salesforce' }
    ),
    logo: 'salesforce',
  },
  {
    id: 'slack',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.slack.title',
      { defaultMessage: 'Slack' }
    ),
    logo: 'slack',
  },
  {
    id: 'splunk',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.splunk.title',
      { defaultMessage: 'Splunk' }
    ),
    logo: 'splunk',
  },
  {
    id: 'jira',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.jira.title',
      { defaultMessage: 'Jira' }
    ),
    logo: 'jira',
  },
] as const;
