/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DashboardAttributes, DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { ReferencedPanelAttributes, ReferencedPanelAttributesWithReferences } from './helpers';

export class ReferencedPanelManager {
  // The panelIndex refers to the ID of the saved object reference, while the panelId refers to the ID of the saved object itself (the panel).
  // So, if the same saved object panel is referenced in two different dashboards, it will have different panelIndex values in each dashboard, but the same panelId, since they're both referencing the same panel.
  private panelsById = new Map<string, ReferencedPanelAttributesWithReferences>();
  private panelIndexToId = new Map<string, string>();

  constructor(private logger: Logger, private soClient: SavedObjectsClientContract) {}

  async fetchReferencedPanel({
    dashboard,
    panel,
  }: {
    dashboard: SavedObjectsFindResult<DashboardAttributes>;
    panel: DashboardPanel;
  }): Promise<void> {
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

    if (this.panelsById.has(panelReference.id)) {
      this.connectPanelIndex(panelIndex, panelReference.id);
    } else {
      try {
        const so = await this.soClient.get<ReferencedPanelAttributes>(type, panelReference.id);
        const referencedPanelWithReferences = {
          ...so.attributes,
          references: so.references,
        };
        this.set(panelReference.id, panelIndex, referencedPanelWithReferences);
      } catch (error) {
        // There was an error fetching the referenced saved object
        this.logger.error(
          `Error fetching panel with type ${type} and id ${panelReference.id}: ${error.message}`
        );
      }
    }
  }

  getByIndex(panelIndex: string): ReferencedPanelAttributesWithReferences | undefined {
    const panelId = this.panelIndexToId.get(panelIndex);
    return panelId ? this.panelsById.get(panelId) : undefined;
  }

  private set(panelId: string, panelIndex: string, panel: ReferencedPanelAttributesWithReferences) {
    this.panelsById.set(panelId, panel);
    this.panelIndexToId.set(panelIndex, panelId);
  }

  private connectPanelIndex(panelIndex: string, panelId: string) {
    if (this.panelsById.has(panelId)) {
      this.panelIndexToId.set(panelIndex, panelId);
    }
  }
}
