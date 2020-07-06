/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { Plugin, CoreSetup, CoreStart } from 'kibana/server';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
} from '../../../../../plugins/global_search/server';
import { createResult } from '../common/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchTestPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchTestPluginStart {}

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
  public setup(core: CoreSetup, { globalSearch }: GlobalSearchTestPluginSetupDeps) {
    globalSearch.registerResultProvider({
      id: 'gs_test_server',
      find: (term, options, context) => {
        if (term.includes('server')) {
          return of([
            createResult({
              id: 'server1',
              type: 'test_server_type',
            }),
            createResult({
              id: 'server2',
              type: 'test_server_type',
            }),
          ]);
        }
        return of([]);
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
