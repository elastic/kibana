/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { CasesAPIServiceProvider } from './api';
import { CasesCommonServiceProvider } from './common';
import { CasesCreateViewServiceProvider } from './create';
import { CasesTableServiceProvider } from './list';
import { CasesNavigationProvider } from './navigation';
import { CasesSingleViewServiceProvider } from './single_case_view';
import { CasesTestResourcesServiceProvider } from './test_resources';

export function CasesServiceProvider(context: FtrProviderContext) {
  const casesCommon = CasesCommonServiceProvider(context);

  return {
    api: CasesAPIServiceProvider(context),
    common: casesCommon,
    casesTable: CasesTableServiceProvider(context, casesCommon),
    create: CasesCreateViewServiceProvider(context, casesCommon),
    navigation: CasesNavigationProvider(context),
    singleCase: CasesSingleViewServiceProvider(context),
    testResources: CasesTestResourcesServiceProvider(context),
  };
}
