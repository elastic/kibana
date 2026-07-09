/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { jsonStringifyDiagnostics } from './synthetics_diagnostics_utils';

/** Above this compact JSON length, skip pretty preview and show a short message instead. */
const SECTION_COMPACT_CHAR_SOFT_LIMIT = 500_000;

const MONITORS_PREVIEW_COUNT = 12;

const summarizeIndicesValue = (value: unknown): string => {
  if (!value || typeof value !== 'object') {
    return jsonStringifyDiagnostics(value);
  }
  const o = value as Record<string, unknown>;
  if (typeof o.error === 'string') {
    return jsonStringifyDiagnostics({ error: o.error });
  }

  const mappingRoot = o.mappings;
  const mappingIndexNames =
    mappingRoot && typeof mappingRoot === 'object'
      ? Object.keys(mappingRoot as Record<string, unknown>)
      : [];

  const settingsRoot = o.settings;
  const settingsIndexNames =
    settingsRoot && typeof settingsRoot === 'object'
      ? Object.keys(settingsRoot as Record<string, unknown>)
      : [];

  const statsRoot = o.stats;
  let statsSummary: unknown;
  if (statsRoot && typeof statsRoot === 'object') {
    const sr = statsRoot as Record<string, unknown>;
    const idx = sr.indices;
    statsSummary = {
      _shards: sr._shards,
      indicesNamedCount:
        idx && typeof idx === 'object' ? Object.keys(idx as Record<string, unknown>).length : 0,
    };
  }

  const summary = {
    _previewNote: i18n.translate('xpack.synthetics.diagnostics.indicesPreviewNote', {
      defaultMessage:
        'Index mappings and full settings are omitted here to keep the UI responsive. Use Download ZIP for complete mappings, settings, and stats.',
    }),
    mappingIndexCount: mappingIndexNames.length,
    mappingIndexNamesSample: mappingIndexNames.slice(0, 25),
    settingsIndexCount: settingsIndexNames.length,
    settingsIndexNamesSample: settingsIndexNames.slice(0, 25),
    statsSummary,
  };

  return jsonStringifyDiagnostics(summary);
};

const buildMonitorsPreview = (value: unknown): string => {
  if (!Array.isArray(value)) {
    return jsonStringifyDiagnostics(value);
  }
  if (value.length === 0) {
    return '[]';
  }
  const slice = value.slice(0, MONITORS_PREVIEW_COUNT);
  const head = jsonStringifyDiagnostics(slice);
  if (value.length <= MONITORS_PREVIEW_COUNT) {
    return head;
  }
  const tail = i18n.translate('xpack.synthetics.diagnostics.monitorsPreviewTruncated', {
    defaultMessage:
      '\n\n/* …and {count} more monitors. Download ZIP for the full redacted monitor list. */',
    values: { count: String(value.length - MONITORS_PREVIEW_COUNT) },
  });
  return `${head}${tail}`;
};

/**
 * Builds flyout preview text for one diagnostics section without freezing the tab on huge payloads.
 */
export const buildDiagnosticsSectionPreview = (sectionKey: string, value: unknown): string => {
  if (sectionKey === 'indices') {
    return summarizeIndicesValue(value);
  }
  if (sectionKey === 'monitors') {
    return buildMonitorsPreview(value);
  }

  let compact: string;
  try {
    compact = JSON.stringify(value);
  } catch {
    return String(value);
  }

  if (compact.length > SECTION_COMPACT_CHAR_SOFT_LIMIT) {
    return i18n.translate('xpack.synthetics.diagnostics.sectionTooLargeForPreview', {
      defaultMessage:
        'This section is about {sizeMb} MB as compact JSON and is not shown in the browser to avoid freezing the tab.\n\nUse “Download ZIP (JSON files)” to inspect the full payload.',
      values: { sizeMb: (compact.length / 1_000_000).toFixed(1) },
    });
  }

  return jsonStringifyDiagnostics(value);
};
