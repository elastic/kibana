/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import {
  DEFAULT_REGIONS_SETTING_KEY,
  DIAMOND_CONNECTOR_SETTING_KEY,
  DIAMOND_GATE_CONNECTOR_SETTING_KEY,
  THREAT_REGIONS,
} from '../../common/threat_intelligence/hub';

/**
 * Per-space advanced setting for the dashboard's location-aware default
 * filter. When set, the Intelligence Hub app pre-fills its `regions`
 * filter from this value on first load. Per-space (not per-user) so an
 * operator can configure the whole space to default to the regions
 * relevant to that tenant — e.g. an APAC space defaults to
 * `["east-asia", "southeast-asia", "oceania"]`.
 *
 * Stored as an array of `ThreatRegion` keywords; the validator below
 * rejects unknown regions so the dashboard never has to handle long-tail
 * free-text input.
 */
export const threatIntelligenceUiSettings: Record<string, UiSettingsParams> = {
  [DEFAULT_REGIONS_SETTING_KEY]: {
    category: ['securitySolution'],
    name: i18n.translate(
      'xpack.securitySolution.threatIntelligence.uiSettings.defaultRegions.name',
      {
        defaultMessage: 'Threat Intelligence — default geographic regions',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.threatIntelligence.uiSettings.defaultRegions.description',
      {
        defaultMessage:
          'Geographic regions to pre-fill on the Threat Intelligence dashboard. ' +
          'Per-space — set this to the macro regions relevant to the tenant in ' +
          'this space (e.g. ["east-asia", "southeast-asia"] for an APAC space).',
      }
    ),
    type: 'array',
    value: [],
    schema: schema.arrayOf(
      schema.string({
        validate: (value) =>
          (THREAT_REGIONS as readonly string[]).includes(value)
            ? undefined
            : `unknown region: ${value}`,
      })
    ),
    requiresPageReload: false,
  },

  [DIAMOND_GATE_CONNECTOR_SETTING_KEY]: {
    category: ['securitySolution'],
    name: i18n.translate(
      'xpack.securitySolution.threatIntelligence.uiSettings.diamondGateConnector.name',
      {
        defaultMessage: 'Threat Intelligence — taxonomy gate connector',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.threatIntelligence.uiSettings.diamondGateConnector.description',
      {
        defaultMessage:
          'GenAI connector ID used for the per-report taxonomy enrichment step ' +
          '(enrich_taxonomy — categories, regions, relevance, detection_actionability, ' +
          'diamond_suitable). Leave blank to use the space-wide default GenAI connector. ' +
          'Set to a cheap model connector (e.g. Haiku) to reduce per-report cost; ' +
          'taxonomy quality degradation is acceptable for the gate classification.',
      }
    ),
    type: 'string',
    value: '',
    schema: schema.string(),
    requiresPageReload: false,
  },

  [DIAMOND_CONNECTOR_SETTING_KEY]: {
    category: ['securitySolution'],
    name: i18n.translate(
      'xpack.securitySolution.threatIntelligence.uiSettings.diamondConnector.name',
      {
        defaultMessage: 'Threat Intelligence — Diamond extraction connector',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.threatIntelligence.uiSettings.diamondConnector.description',
      {
        defaultMessage:
          'GenAI connector ID used for the heavy Diamond Model extraction step ' +
          '(extract_diamond — adversary/capability/infrastructure/victim summaries). ' +
          'Only called for threat-positive reports (diamond_suitable == true). ' +
          'Leave blank to use the space-wide default GenAI connector. ' +
          'Set to a capable model connector (e.g. Sonnet/Opus) for best extraction quality.',
      }
    ),
    type: 'string',
    value: '',
    schema: schema.string(),
    requiresPageReload: false,
  },
};
