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

export class DashboardResourceIdentifier extends ResourceIdentifier<OriginalDashboard> {
  public async fromOriginal(item: OriginalDashboard): Promise<SiemMigrationResourceBase[]> {
    const originalDashboardXMLString = item?.data;

    if (!originalDashboardXMLString) {
      return [];
    }
    const splunkDashboardXMLPaser = await getSplunkDashboardXmlParser(originalDashboardXMLString, {
      experimentalFeatures: this.deps.experimentalFeatures,
    });
    const queries: string[] = await splunkDashboardXMLPaser.extractQueries();
    const resources = await Promise.all(queries.map((query) => this.identifier(query)));
    return resources.flat();
  }
}
