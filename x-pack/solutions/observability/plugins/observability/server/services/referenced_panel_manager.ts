/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import type { ReferencedPanelAttributes, ReferencedPanelAttributesWithReferences } from './helpers';

export class ReferencedPanelManager {
  // The panelIndex refers to the ID of the saved object reference, while the panelId refers to the ID of the saved object itself (the panel).
  // So, if the same saved object panel is referenced in two different dashboards, it will have different panelIndex values in each dashboard, but the same panelId, since they're both referencing the same panel.
  private panelsById = new Map<string, ReferencedPanelAttributesWithReferences>();
  private panelIndexToId = new Map<string, string>();
  private panelsTypeById = new Map<string, string>();

  constructor(private logger: Logger, private soClient: SavedObjectsClientContract) {}

  async fetchReferencedPanels(): Promise<void> {
    if (this.panelsTypeById.size === 0) {
      return;
    }

    const panelsToFetch = [...this.panelsTypeById.entries()].map(([id, type]) => ({ id, type }));

    try {
      const { saved_objects: savedObjects } =
        await this.soClient.bulkGet<ReferencedPanelAttributes>(panelsToFetch);

      savedObjects.forEach((so) => {
        this.panelsById.set(so.id, {
          ...so.attributes,
          references: so.references,
        });
      });
    } catch (error) {
      this.logger.error(`Error fetching ${panelsToFetch.length} panels : ${error.message}`);
    }
  }

  getByIndex(panelIndex: string): ReferencedPanelAttributesWithReferences | undefined {
    const panelId = this.panelIndexToId.get(panelIndex);
    return panelId ? this.panelsById.get(panelId) : undefined;
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
