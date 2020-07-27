/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { map, reduce } from 'rxjs/operators';
import { Plugin, CoreSetup, CoreStart, AppMountParameters } from 'kibana/public';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  GlobalSearchResult,
} from '../../../../../plugins/global_search/public';
import { createResult } from '../common/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchTestPluginSetup {}
export interface GlobalSearchTestPluginStart {
  findTest: (term: string) => Promise<GlobalSearchResult[]>;
  findReal: (term: string) => Promise<GlobalSearchResult[]>;
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
    > {
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

    globalSearch.registerResultProvider({
      id: 'gs_test_client',
      find: (term, options) => {
        if (term.includes('client')) {
          return of([
            createResult({
              id: 'client1',
              type: 'test_client_type',
            }),
            createResult({
              id: 'client2',
              type: 'test_client_type',
            }),
          ]);
        }
        return of([]);
      },
    });

    return {};
  }

  public start(
    {}: CoreStart,
    { globalSearch }: GlobalSearchTestPluginStartDeps
  ): GlobalSearchTestPluginStart {
    return {
      findTest: (term) =>
        globalSearch
          .find(term, {})
          .pipe(
            map((batch) => batch.results),
            // restrict to test type to avoid failure when real providers are present
            map((results) => results.filter((r) => r.type.startsWith('test_'))),
            reduce((memo, results) => [...memo, ...results])
          )
          .toPromise(),
      findReal: (term) =>
        globalSearch
          .find(term, {})
          .pipe(
            map((batch) => batch.results),
            // remove test types
            map((results) => results.filter((r) => !r.type.startsWith('test_'))),
            reduce((memo, results) => [...memo, ...results])
          )
          .toPromise(),
    };
  }
}
