/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: move resource related types to migration.gen.ts
import { ResourceIdentifier } from '../../resources/resource_identifier';
import type { OriginalDashboard } from '../../model/dashboard_migration.gen';
import { SplunkXmlDashboardParser } from '../../parsers/splunk/dashboard_xml';
import type { RuleMigrationResourceBase } from '../../model/rule_migration.gen';

export class DashboardResourceIdentifier extends ResourceIdentifier<OriginalDashboard> {
  public async fromOriginal(item: OriginalDashboard): Promise<RuleMigrationResourceBase[]> {
    const originalDashboardXMLString = item?.data;

    if (!originalDashboardXMLString) {
      return [];
    }
    const splunkDashboardXMLPaser = new SplunkXmlDashboardParser(originalDashboardXMLString);
    const queries: string[] = await splunkDashboardXMLPaser.extractQueries();
    return queries.flatMap((query) => this.identifier(query));
  }
}
