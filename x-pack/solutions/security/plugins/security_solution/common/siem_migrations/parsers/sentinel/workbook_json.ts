/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { SentinelWorkbookArmResource } from '../../model/vendor/dashboards/sentinel.gen';
import type { ParsedPanel, PanelPosition, VizType } from '../types';
import type { SentinelWorkbook, SentinelWorkbookItem } from './workbook_types';

const SENTINEL_WORKBOOK_TYPE = 'Microsoft.Insights/workbooks';
const QUERY_ITEM_TYPE = 3;
const PANEL_HEIGHT = 16;
const PANEL_WIDTH = 48;

/**
 * Processes pre-validated Sentinel ARM template Workbook resources into `SentinelWorkbook`
 * objects with parsed query panels.
 *
 * Only `type: 3` items (queries) inside `serializedData` are surfaced. Non-KQL `queryType`
 * panels are still surfaced so the downstream graph can mark them as untranslatable.
 */
export class SentinelWorkbookParser {
  private readonly resources: SentinelWorkbookArmResource[];

  constructor(resources: SentinelWorkbookArmResource[]) {
    this.resources = resources;
  }

  /**
   * Returns all valid Sentinel Workbooks from the resources.
   */
  public getWorkbooks(): SentinelWorkbook[] {
    return this.resources
      .map((resource) => this.processResource(resource))
      .filter((workbook): workbook is SentinelWorkbook => workbook !== undefined);
  }

  /**
   * Returns the de-duplicated KQL query strings across all parsed Workbooks.
   */
  public getQueries(): string[] {
    const seen = new Set<string>();
    for (const workbook of this.getWorkbooks()) {
      for (const panel of workbook.panels) {
        if (panel.query && !seen.has(panel.query)) {
          seen.add(panel.query);
        }
      }
    }
    return Array.from(seen);
  }

  private processResource(resource: SentinelWorkbookArmResource): SentinelWorkbook | undefined {
    if (resource.type && resource.type !== SENTINEL_WORKBOOK_TYPE) {
      return undefined;
    }

    const { properties } = resource;
    if (!properties || !properties.displayName || !properties.serializedData) {
      return undefined;
    }

    const definition = parseSerializedData(properties.serializedData);
    if (!definition) {
      return undefined;
    }

    const items: SentinelWorkbookItem[] = Array.isArray(definition.items) ? definition.items : [];
    const panels = extractPanelsFromItems(items);

    const id = resource.name ?? resource.id ?? properties.displayName;

    return {
      id,
      title: properties.displayName,
      description: properties.description ?? '',
      serializedData: properties.serializedData,
      panels,
    };
  }
}

/**
 * Defensive JSON parse: returns `undefined` when serializedData is malformed.
 */
const parseSerializedData = (raw: string): { items?: unknown } | undefined => {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Extracts non-empty KQL query strings from a single Workbook's serializedData JSON.
 * Returns an empty array when serializedData is malformed or contains no query items.
 */
export const extractQueriesFromSerializedData = (serializedData: string): string[] => {
  const definition = parseSerializedData(serializedData);
  if (!definition) {
    return [];
  }
  const items: SentinelWorkbookItem[] = Array.isArray(definition.items) ? definition.items : [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.type === QUERY_ITEM_TYPE) {
      const query = item.content?.query?.trim();
      if (query) {
        seen.add(query);
      }
    }
  }
  return Array.from(seen);
};

const KQL_QUERY_TYPE = 0;

const extractPanelsFromItems = (items: SentinelWorkbookItem[]): ParsedPanel[] => {
  // First-pass scope: query items only. Non-query items (markdown/parameters/etc.) are skipped.
  // Items with missing or empty query strings are also dropped before laying out positions.
  const queryPanels = items.flatMap((item) => {
    if (item.type !== QUERY_ITEM_TYPE) return [];
    const rawQuery = item.content?.query;
    if (typeof rawQuery !== 'string') return [];
    const query = rawQuery.trim();
    if (query.length === 0) return [];
    return [{ item, query }];
  });

  return queryPanels.map(({ item, query }, panelIndex) => {
    const title =
      typeof item.title === 'string' && item.title.trim().length > 0
        ? item.title.trim()
        : item.name ?? `Untitled Panel ${panelIndex}`;

    // Workbook queryType 0 (or undefined) = KQL/Logs. Anything else (e.g. 1 = ARG) is
    // not currently translatable; mark it so downstream stages can short-circuit.
    const queryType = item.content?.queryType;
    const isKql =
      queryType === undefined || queryType === KQL_QUERY_TYPE || queryType === `${KQL_QUERY_TYPE}`;

    return {
      id: uuidV4(),
      title,
      query,
      viz_type: mapVizType(item.content?.visualization),
      position: stackedPosition(panelIndex),
      query_language: isKql ? 'kql' : 'unsupported',
    };
  });
};

const stackedPosition = (index: number): PanelPosition => ({
  x: 0,
  y: index * PANEL_HEIGHT,
  w: PANEL_WIDTH,
  h: PANEL_HEIGHT,
});

const VIZ_TYPE_MAP: Record<string, VizType> = {
  table: 'table',
  barchart: 'bar_vertical',
  linechart: 'line',
  areachart: 'area',
  piechart: 'pie',
  tiles: 'metric',
  scatterchart: 'line',
};

const mapVizType = (visualization: string | undefined): VizType => {
  if (!visualization) return 'table';
  return VIZ_TYPE_MAP[visualization.toLowerCase()] ?? 'table';
};
