/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SupportedLogo } from '../../shared/logo_icon';

export interface MoreIntegrationTileDefinition {
  id: string;
  title: string;
  logo: SupportedLogo;
}

export const MORE_INTEGRATION_TILES: readonly MoreIntegrationTileDefinition[] = [
  {
    id: 'confluence',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrations.tile.confluence.title',
      { defaultMessage: 'Confluence' }
    ),
    logo: 'confluence',
  },
  {
    id: 'salesforce',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrations.tile.salesforce.title',
      { defaultMessage: 'Salesforce' }
    ),
    logo: 'salesforce',
  },
  {
    id: 'slack',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrations.tile.slack.title',
      { defaultMessage: 'Slack' }
    ),
    logo: 'slack',
  },
  {
    id: 'splunk',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrations.tile.splunk.title',
      { defaultMessage: 'Splunk' }
    ),
    logo: 'splunk',
  },
  {
    id: 'jira',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrations.tile.jira.title',
      { defaultMessage: 'Jira' }
    ),
    logo: 'jira',
  },
] as const;
