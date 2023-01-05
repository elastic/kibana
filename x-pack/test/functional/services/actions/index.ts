/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { ActionsCommonServiceProvider } from './common';
import { ActionsOpsgenieServiceProvider } from './opsgenie';
import { ActionsTinesServiceProvider } from './tines';
import { ActionsAPIServiceProvider } from './api';

export function ActionsServiceProvider(context: FtrProviderContext) {
  const common = ActionsCommonServiceProvider(context);

  return {
    api: ActionsAPIServiceProvider(context),
    common: ActionsCommonServiceProvider(context),
    opsgenie: ActionsOpsgenieServiceProvider(context, common),
    tines: ActionsTinesServiceProvider(context, common),
  };
}
