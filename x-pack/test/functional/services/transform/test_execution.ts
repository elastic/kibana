/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformTestExecutionProvider({ getService }: FtrProviderContext) {
  const log = getService('log');

  return {
    async logTestStep(stepTitle: string) {
      await log.debug(`=== TEST STEP === ${stepTitle}`);
    },
  };
}
