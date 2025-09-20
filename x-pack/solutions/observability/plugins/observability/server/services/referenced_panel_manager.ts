/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { ReferencedPanelAttributes, ReferencedPanelAttributesWithReferences } from './helpers';

/**
 * The ReferencedPanelManager class manages the relationship between dashboard panels and their references.
 *
 * It's responsible for:
 * - Tracking panels that are referenced in dashboards but require lazy loading
 * - Maintaining the relationship between panelIndex (the reference ID in a dashboard) and panelId (the actual saved object ID)
 * - Fetching panel details when needed via bulkGet operations
 * - Providing access to panel attributes and references via the panelIndex
 *
 * This class is essential for handling dashboard panels that have their configuration stored as separate
 * saved objects, allowing the system to resolve and retrieve the actual panel configuration when needed
 * to analyze fields, indices, and other properties of visualization panels.
 */
export class ReferencedPanelManager {
  // The panelIndex refers to the ID of the saved object reference, while the panelId refers to the ID of the saved object itself (the panel).
  // So, if the same saved object panel is referenced in two different dashboards, it will have different panelIndex values in each dashboard, but the same panelId, since they're both referencing the same panel.
  private panelsById = new Map<string, ReferencedPanelAttributesWithReferences>();
  private panelIndexToId = new Map<string, string>();
  private panelsTypeById = new Map<string, string>();

  constructor(private logger: Logger, private soClient: SavedObjectsClientContract) {}

  async fetchReferencedPanels(): Promise<number> {
    if (this.panelsTypeById.size === 0) {
      return 0;
    }

    const panelsToFetch = [...this.panelsTypeById.entries()].map(([id, type]) => ({ id, type }));

    let savedObjects;
    try {
      const response = await this.soClient.bulkGet<ReferencedPanelAttributes>(panelsToFetch);
      savedObjects = response.saved_objects;
    } catch (error) {
      this.logger.error(`Failed to fetch referenced panels: ${error}`);
      return 0;
    }

    savedObjects.forEach((so) => {
      this.panelsById.set(so.id, {
        ...so.attributes,
        references: so.references,
      });
    });

    return savedObjects.length;
  }

  getByIndex(panelIndex: string): ReferencedPanelAttributesWithReferences | undefined {
    const panelId = this.panelIndexToId.get(panelIndex);
    return panelId ? this.panelsById.get(panelId) : undefined;
  }

  getPanelIndices(panel: DashboardPanel): Set<string> {
    const res = new Set<string>();
    let references = isLensVizAttributesForPanel(panel.panelConfig.attributes)
      ? panel.panelConfig.attributes.references
      : undefined;
    if (!references && panel.panelIndex) {
      references = this.getByIndex(panel.panelIndex)?.references;
    }

    const idxPatternMatcher = /indexpattern/;
    references
      ?.filter((r) => idxPatternMatcher.test(r.name))
      .forEach((reference) => {
        res.add(reference.id);
      });

    return res;
  }

  getPanelFields(panel: DashboardPanel): string[] {
    if (panel.type !== 'lens') {
      return [];
    }

    let state: unknown = isLensVizAttributesForPanel(panel.panelConfig.attributes)
      ? panel.panelConfig.attributes.state
      : undefined;
    if (!state && panel.panelIndex) {
      state = this.getByIndex(panel.panelIndex)?.state;
    }
    if (isLensAttributesState(state)) {
      const fields: string[] = [];
      const dataSourceLayers = state.datasourceStates.formBased?.layers || {};
      Object.values(dataSourceLayers).forEach((ds) => {
        const columns = ds.columns;
        Object.values(columns).forEach((col) => {
          if ('sourceField' in col) {
            fields.push(col.sourceField);
          }
        });
      });
      return fields;
    }
    return [];
  }

  // This method adds the panel type to the map, so that we can fetch the panel later and it links the panelIndex to the panelId.
  addReferencedPanel({
    dashboard,
    panel,
  }: {
    dashboard: SavedObjectsFindResult<DashboardAttributes>;
    panel: DashboardPanel;
  }) {
    const { panelIndex, type } = panel;
    if (!panelIndex) return;

    const panelReference = dashboard.references.find(
      (r) => r.name.includes(panelIndex) && r.type === type
    );
    // A reference of the panel was not found
    if (!panelReference) {
      this.logger.error(
        `Reference for panel of type ${type} and panelIndex ${panelIndex} was not found in dashboard with id ${dashboard.id}`
      );
      return;
    }

    const panelId = panelReference.id;

    this.panelIndexToId.set(panelIndex, panelId);

    if (!this.panelsTypeById.has(panelId)) {
      this.panelsTypeById.set(panelId, panel.type);
    }
  }
}

function isLensAttributesState(state: unknown): state is LensAttributes['state'] {
  return typeof state === 'object' && state !== null && 'datasourceStates' in state;
}

function isLensVizAttributesForPanel(attributes: unknown): attributes is LensAttributes {
  if (!attributes) {
    return false;
  }
  return (
    Boolean(attributes) &&
    typeof attributes === 'object' &&
    'type' in attributes &&
    attributes.type === 'lens'
  );
}
