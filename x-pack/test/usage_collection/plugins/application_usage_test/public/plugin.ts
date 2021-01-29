/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import { first } from 'rxjs/operators';
import './types';

export class ApplicationUsageTest implements Plugin {
  public setup(core: CoreSetup) {}

  public async start(core: CoreStart) {
    const applications = await core.application.applications$.pipe(first()).toPromise();
    window.__applicationIds__ = [...applications.keys()];
  }
}
