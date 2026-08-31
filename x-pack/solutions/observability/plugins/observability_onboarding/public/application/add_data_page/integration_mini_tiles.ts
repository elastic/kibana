/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SupportedLogo } from '../shared/logo_icon';

export interface IntegrationMiniTileData {
  id: string;
  title: string;
  logo: SupportedLogo;
  /** EPR package whose integrations detail page the tile opens. */
  eprPackage?: string;
  /** Internal onboarding-app route the tile opens. */
  route?: string;
  /** Fleet integration group whose chooser this tile opens instead of navigating,
   * falling back to its normal navigation when Fleet has no card for the group. */
  collectionGroup?: string;
}

export const INTEGRATION_MINI_TILES: readonly IntegrationMiniTileData[] = [
  {
    id: 'prometheus',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.prometheus.title',
      { defaultMessage: 'Prometheus' }
    ),
    logo: 'prometheus',
    eprPackage: 'prometheus',
    collectionGroup: 'prometheus',
  },
  {
    id: 'supabase',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.supabase.title',
      { defaultMessage: 'Supabase' }
    ),
    logo: 'supabase',
    eprPackage: 'supabase',
  },
  {
    id: 'auto_import',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.autoImport.title',
      { defaultMessage: 'Auto Import' }
    ),
    logo: 'auto_import',
  },
  {
    id: 'upload_file',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.uploadFile.title',
      { defaultMessage: 'Upload a file' }
    ),
    logo: 'upload_file',
  },
  {
    id: 'custom_logs',
    title: i18n.translate(
      'xpack.observability_onboarding.integrationsGrid.moreIntegrationsSection.miniIntegrationTile.customLogs.title',
      { defaultMessage: 'Custom logs' }
    ),
    logo: 'custom_logs',
    route: '/otel-logs',
  },
] as const;
