/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceIdentifier } from '../../resources';
import type { SiemMigrationResourceBase } from '../../model/common.gen';
import type { OriginalDashboard } from '../../model/dashboard_migration.gen';
import { getSplunkDashboardXmlParser } from '../../parsers/splunk/get_dashboard_xml_parser';
import { extractQueriesFromSerializedData } from '../../parsers/sentinel/workbook_json';

export class DashboardResourceIdentifier extends ResourceIdentifier<OriginalDashboard> {
  public async fromOriginal(item: OriginalDashboard): Promise<SiemMigrationResourceBase[]> {
    const data = item?.data;
    if (!data) {
      return [];
    }

    const queries =
      item.vendor === 'microsoft-sentinel'
        ? extractQueriesFromSerializedData(data)
        : await this.extractSplunkQueries(data);

    const resources = await Promise.all(queries.map((query) => this.identifier(query)));
    return resources.flat();
  }

  private async extractSplunkQueries(xml: string): Promise<string[]> {
    const parser = await getSplunkDashboardXmlParser(xml, {
      experimentalFeatures: this.deps.experimentalFeatures,
    });
    return parser.extractQueries();
  }
}
