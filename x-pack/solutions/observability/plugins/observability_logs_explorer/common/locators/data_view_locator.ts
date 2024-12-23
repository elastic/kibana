/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { DataViewSelection } from '@kbn/logs-explorer-plugin/common';
import {
  ObsLogsExplorerDataViewLocatorParams,
  OBS_LOGS_EXPLORER_DATA_VIEW_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { constructLocatorPath } from './utils';
import { ObsLogsExplorerLocatorDependencies } from './types';

export type DataViewLocator = LocatorPublic<ObsLogsExplorerDataViewLocatorParams>;

export class DataViewLocatorDefinition
  implements LocatorDefinition<ObsLogsExplorerDataViewLocatorParams>
{
  public readonly id = OBS_LOGS_EXPLORER_DATA_VIEW_LOCATOR_ID;

  constructor(protected readonly deps: ObsLogsExplorerLocatorDependencies) {}

  public readonly getLocation = (params: ObsLogsExplorerDataViewLocatorParams) => {
    const { useHash } = this.deps;
    const { id, ...locatorParams } = params;

    const dataViewSelection = DataViewSelection.fromSelection({
      dataView: { id },
    });

    return constructLocatorPath({
      dataSourceSelection: dataViewSelection.toPlainSelection(),
      locatorParams,
      useHash,
    });
  };
}
