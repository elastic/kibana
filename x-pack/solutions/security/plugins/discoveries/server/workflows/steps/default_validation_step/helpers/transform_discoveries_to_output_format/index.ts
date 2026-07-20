/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

interface RawDiscovery {
  alert_ids: string[];
  details_markdown: string;
  entity_summary_markdown?: string;
  id?: string;
  mitre_attack_tactics?: string[];
  summary_markdown: string;
  timestamp?: string;
  title: string;
}

interface TransformedDiscovery {
  alert_ids: string[];
  connector_id: string;
  connector_name: string;
  details_markdown: string;
  entity_summary_markdown?: string;
  generation_uuid: string;
  id: string;
  mitre_attack_tactics?: string[];
  replacements?: Record<string, string>;
  summary_markdown: string;
  timestamp: string;
  title: string;
}

/**
 * Transforms raw generation-format discoveries into the same shape that
 * `validateAttackDiscoveries` returns, without touching Elasticsearch.
 */
export const transformDiscoveriesToOutputFormat = ({
  attackDiscoveries,
  connectorId,
  connectorName,
  generationUuid,
  replacements,
}: {
  attackDiscoveries: RawDiscovery[];
  connectorId: string;
  connectorName: string;
  generationUuid: string;
  replacements?: Record<string, string>;
}): TransformedDiscovery[] =>
  attackDiscoveries.map((discovery) => ({
    alert_ids: discovery.alert_ids,
    connector_id: connectorId,
    connector_name: connectorName,
    details_markdown: discovery.details_markdown,
    ...(discovery.entity_summary_markdown != null
      ? { entity_summary_markdown: discovery.entity_summary_markdown }
      : {}),
    generation_uuid: generationUuid,
    id: discovery.id ?? uuidv4(),
    ...(discovery.mitre_attack_tactics != null
      ? { mitre_attack_tactics: discovery.mitre_attack_tactics }
      : {}),
    ...(replacements != null ? { replacements } : {}),
    summary_markdown: discovery.summary_markdown,
    timestamp: discovery.timestamp ?? new Date().toISOString(),
    title: discovery.title,
  }));
