/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { KubernetesSecurityDeps, KubernetesSecurityServices } from './types';
import { getKubernetesSecurityLazy } from './methods';

export type { KubernetesSecurityStart } from './types';

export class KubernetesSecurityPlugin implements Plugin {
  public setup(core: CoreSetup<KubernetesSecurityServices, void>) {}

  public start(core: CoreStart) {
    return {
      getKubernetesPage: (kubernetesSecurityDeps: KubernetesSecurityDeps) =>
        getKubernetesSecurityLazy(kubernetesSecurityDeps),
    };
  }

  public stop() {}
}
