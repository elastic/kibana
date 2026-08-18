/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import type { PluginStart, StartPluginsDependencies } from '../../types';

/**
 * Returns an ES|QL source enricher that adds the current space's Security alerts index
 * (.alerts-security.alerts-{spaceId}) to the sources list.
 *
 * The ESQL editor fetches available indices using expand_wildcards:'open', which excludes
 * hidden indices like .alerts-security.alerts-default. Without this enricher the editor
 * shows a false "Unknown data source" validation error for queries that target that index.
 */
export const createEsqlAlertsSourceEnricher =
  (getStartServices: CoreSetup<StartPluginsDependencies, PluginStart>['getStartServices']) =>
  async (sources: ESQLSourceResult[]): Promise<ESQLSourceResult[]> => {
    const [, startPlugins] = await getStartServices();
    const { id: spaceId } = await startPlugins.spaces.getActiveSpace();
    const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

    if (sources.some((s) => s.name === alertsIndex)) return sources;

    return [...sources, { hidden: true, name: alertsIndex }];
  };
