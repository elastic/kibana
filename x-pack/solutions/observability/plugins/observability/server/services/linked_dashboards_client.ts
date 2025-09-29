/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { Logger, SavedObjectsFindResult } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';
import type { LinkedDashboard } from '@kbn/observability-schema';
import plimit from 'p-limit';

type Dashboard = SavedObjectsFindResult<DashboardAttributes>;

export class LinkedDashboardsClient {
  constructor(private logger: Logger, private dashboardClient: IContentClient<Dashboard>) {}

  async getLinkedDashboardsByIds(ids: string[]): Promise<LinkedDashboard[]> {
    const limit = plimit(5);
    const linkedDashboardsResponse = await Promise.all(
      ids.map((id) => limit(() => this.getLinkedDashboardById(id)))
    );
    return linkedDashboardsResponse.filter((dashboard): dashboard is LinkedDashboard =>
      Boolean(dashboard)
    );
  }

  private async getLinkedDashboardById(id: string): Promise<LinkedDashboard | null> {
    try {
      const dashboardResponse = await this.dashboardClient.get(id);
      return {
        id: dashboardResponse.result.item.id,
        title: dashboardResponse.result.item.attributes.title,
        matchedBy: { linked: true },
        description: dashboardResponse.result.item.attributes.description,
        tags: dashboardResponse.result.item.attributes.tags,
      };
    } catch (error) {
      if (error?.output?.statusCode === 404) {
        this.logger.warn(`Linked dashboard with id ${id} not found. Skipping.`);
        return null;
      }
      throw new Error(`Error fetching dashboard with id ${id}: ${error.message || error}`);
    }
  }
}
