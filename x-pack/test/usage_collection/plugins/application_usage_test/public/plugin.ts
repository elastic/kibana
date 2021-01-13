/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import { first } from 'rxjs/operators';
import expect from '@kbn/expect';
import { applicationUsageSchema } from '../../../../../../src/plugins/kibana_usage_collection/server/collectors/application_usage/schema';

export class ApplicationUsageTest implements Plugin {
  public setup(core: CoreSetup) {}

  public async start(core: CoreStart) {
    if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      return;
    }
    const applications = await core.application.applications$.pipe(first()).toPromise();
    const appIds = [...applications.keys()].sort();

    try {
      // When the lists don't match, the entire page load will fail.
      expect(Object.keys(applicationUsageSchema).sort()).to.eql(appIds);
    } catch (err) {
      err.message = `Application Usage's schema is not up-to-date with the actual registered apps. Please update it at src/plugins/kibana_usage_collection/server/collectors/application_usage/schema.ts.\n${err.message}`;
      throw err;
    }
  }
}
