/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext, Logger } from 'kibana/server';
import { schema } from '@kbn/config-schema';

import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../../plugins/features/server';
import { SpacesPluginStart } from '../../../../../../../plugins/spaces/server';
import { SecurityPluginStart } from '../../../../../../../plugins/security/server';
import { PluginsStartContract as CasesPluginStart } from '../../../../../../../plugins/cases/server';
import { CasesPatchRequest } from '../../../../../../../plugins/cases/common';
import { wrapError } from '../../../../../../../plugins/cases//server/routes/api/utils';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
}

export interface FixtureStartDeps {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  cases?: CasesPluginStart;
}

/**
 * These are a copy of the values here: x-pack/plugins/cases/common/constants.ts because when the plugin attempts to
 * import them from the constants.ts file it gets an error.
 */
const casesSavedObjectTypes = [
  'cases',
  'cases-connector-mappings',
  'cases-sub-case',
  'cases-user-actions',
  'cases-comments',
  'cases-configure',
];

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  private readonly log: Logger;
  private casesPluginStart?: CasesPluginStart;
  constructor(initContext: PluginInitializerContext) {
    this.log = initContext.logger.get();
  }

  public setup(core: CoreSetup<FixtureStartDeps>, deps: FixtureSetupDeps) {
    const router = core.http.createRouter();
    /**
     * This simply wraps the cases patch case api so that we can test updating the status of an alert using
     * the cases client interface instead of going through the case plugin's RESTful interface
     */
    router.patch(
      {
        path: '/api/cases_user/cases',
        validate: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
      },
      async (context, request, response) => {
        try {
          const client = await this.casesPluginStart?.getCasesClientWithRequest(request);
          if (!client) {
            throw new Error('Cases client was undefined');
          }

          return response.ok({
            body: await client.cases.update(request.body as CasesPatchRequest),
          });
        } catch (error) {
          this.log.error(`CasesClientUser failure: ${error}`);
          return response.customError(wrapError(error));
        }
      }
    );
  }
  public start(core: CoreStart, plugins: FixtureStartDeps) {
    this.casesPluginStart = plugins.cases;
  }
  public stop() {}
}
