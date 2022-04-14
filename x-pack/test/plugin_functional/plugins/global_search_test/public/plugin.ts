/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, reduce } from 'rxjs/operators';
import { Plugin, CoreSetup, CoreStart, AppMountParameters } from 'kibana/public';
import { lastValueFrom } from 'rxjs';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchResult,
} from '../../../../../plugins/global_search/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchTestPluginSetup {}
export interface GlobalSearchTestPluginStart {
  find: (term: string) => Promise<GlobalSearchResult[]>;
}

export interface GlobalSearchTestPluginSetupDeps {
  globalSearch: GlobalSearchPluginSetup;
}
export interface GlobalSearchTestPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
}

export class GlobalSearchTestPlugin
  implements
    Plugin<
      GlobalSearchTestPluginSetup,
      GlobalSearchTestPluginStart,
      GlobalSearchTestPluginSetupDeps,
      GlobalSearchTestPluginStartDeps
    >
{
  public setup(
    { application, getStartServices }: CoreSetup,
    { globalSearch }: GlobalSearchTestPluginSetupDeps
  ) {
    application.register({
      id: 'globalSearchTestApp',
      title: 'GlobalSearch test',
      mount: (params: AppMountParameters) => {
        return () => undefined;
      },
    });

    return {};
  }

  public start(
    {}: CoreStart,
    { globalSearch }: GlobalSearchTestPluginStartDeps
  ): GlobalSearchTestPluginStart {
    return {
      find: (term) =>
        lastValueFrom(
          globalSearch.find({ term }, {}).pipe(
            map((batch) => batch.results),
            reduce((memo, results) => [...memo, ...results])
          )
        ),
    };
  }
}
