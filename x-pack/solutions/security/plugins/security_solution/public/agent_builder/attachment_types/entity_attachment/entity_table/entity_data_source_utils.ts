/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pretty-print an `entity.source` value for display. The entity store keeps
 * sources as lowercase integration keys (e.g. `crowdstrike`, `island_browser`).
 * The chat table renders them as title-cased labels with underscores swapped
 * for spaces so they read like product names. Filters issued back to the tool
 * still need to use the raw key — see `entity_analytics_skill.ts`.
 *
 * Examples:
 * - `crowdstrike` → `Crowdstrike`
 * - `island_browser` → `Island Browser`
 * - `microsoft_defender_for_endpoint` → `Microsoft Defender For Endpoint`
 * - `''` → `''`
 */
export const formatEntitySource = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
