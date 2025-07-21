/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/plugins/shared/streams/server/lib/streams/state_management/errors/failed_to_rollback_error.ts
import { StatusError } from '../../errors/status_error';

export class FailedToRollbackError extends StatusError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'FailedToRollbackError';
  }
}
========
import { GenericFtrProviderContext } from '@kbn/test';
import { services } from './services';
import { pageObjects } from './page_objects';

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
>>>>>>>> 16417b6d6c2 ([ska] relocate cypress & plugin functional tests (#228681)):x-pack/solutions/security/test/plugin_functional/ftr_provider_context.d.ts
