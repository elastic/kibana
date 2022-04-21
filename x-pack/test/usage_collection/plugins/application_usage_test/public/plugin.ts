/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import './types';
import { firstValueFrom } from 'rxjs';

export class ApplicationUsageTest implements Plugin {
  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {
    firstValueFrom(core.application.applications$).then((applications) => {
      window.__applicationIds__ = [...applications.keys()];
    });
  }
}
