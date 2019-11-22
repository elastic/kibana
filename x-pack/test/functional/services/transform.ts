/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

import {
  TransformAPIProvider,
  TransformManagementProvider,
  TransformNavigationProvider,
  TransformSourceSelectionProvider,
  TransformTableProvider,
  TransformWizardProvider,
} from './transform_ui';

export function TransformProvider(context: FtrProviderContext) {
  const api = TransformAPIProvider(context);
  const management = TransformManagementProvider(context);
  const navigation = TransformNavigationProvider(context);
  const sourceSelection = TransformSourceSelectionProvider(context);
  const table = TransformTableProvider(context);
  const wizard = TransformWizardProvider(context);

  return {
    api,
    management,
    navigation,
    sourceSelection,
    table,
    wizard,
  };
}
