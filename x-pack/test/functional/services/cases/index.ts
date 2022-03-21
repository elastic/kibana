/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { CasesAppAPIServiceProvider } from './api';
import { CasesAppCommonServiceProvider } from './common';

export function CasesAppServiceProvider(context: FtrProviderContext) {
  return {
    api: CasesAppAPIServiceProvider(context),
    common: CasesAppCommonServiceProvider(context),
  };
}
