/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnSetup } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { DetectionAccountService } from '../lib/service_account/detection_account';
import { DetectionSetupService } from '../lib/service_account/setup_service';
import { DETECTION_ENGINE_WORKLOAD_TYPE } from '../lib/service_account/workload';

/** Binds the account services and registers the engine's workload type at setup. */
export function bindServiceAccount({ bind }: ContainerModuleLoadOptions): void {
  bind(DetectionAccountService).toSelf().inSingletonScope();
  bind(DetectionSetupService).toSelf().inSingletonScope();

  // Binding or running as an account is refused for an unregistered workload type.
  bind(OnSetup).toResolvedValue(
    (security) => () => {
      security.serviceAccounts.registerWorkloadType({
        type: DETECTION_ENGINE_WORKLOAD_TYPE,
        name: 'Nightshift detection engine',
        description:
          'Work the Nightshift detection engine does outside workflow runs, such as reading customer data on each tick.',
      });
    },
    [CoreSetup('security')]
  );
}
