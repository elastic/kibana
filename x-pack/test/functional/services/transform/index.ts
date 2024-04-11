/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { TransformAPIProvider } from './api';
import { TransformEditFlyoutProvider } from './edit_flyout';
import { TransformDatePickerProvider } from './date_picker';
import { TransformDiscoverProvider } from './discover';
import { TransformManagementProvider } from './management';
import { TransformNavigationProvider } from './navigation';
import { TransformSecurityCommonProvider } from './security_common';
import { TransformSecurityUIProvider } from './security_ui';
import { TransformSourceSelectionProvider } from './source_selection';
import { TransformTableProvider } from './transform_table';
import { TransformTestExecutionProvider } from './test_execution';
import { TransformWizardProvider } from './wizard';
import { TransformAlertingProvider } from './alerting';

import { MachineLearningAPIProvider } from '../ml/api';
import { MachineLearningTestResourcesProvider } from '../ml/test_resources';
import { MachineLearningSecurityCommonProvider } from '../ml/security_common';

export function TransformProvider(context: FtrProviderContext) {
  const api = TransformAPIProvider(context);
  const mlSecurityCommon = MachineLearningSecurityCommonProvider(context);
  const mlApi = MachineLearningAPIProvider(context, mlSecurityCommon);
  const datePicker = TransformDatePickerProvider(context);
  const discover = TransformDiscoverProvider(context);
  const editFlyout = TransformEditFlyoutProvider(context);
  const management = TransformManagementProvider(context);
  const navigation = TransformNavigationProvider(context);
  const securityCommon = TransformSecurityCommonProvider(context);
  const securityUI = TransformSecurityUIProvider(context, securityCommon);
  const sourceSelection = TransformSourceSelectionProvider(context);
  const table = TransformTableProvider(context);
  const testExecution = TransformTestExecutionProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context, mlApi);
  const wizard = TransformWizardProvider(context);
  const alerting = TransformAlertingProvider(context);

  return {
    alerting,
    api,
    datePicker,
    discover,
    editFlyout,
    management,
    navigation,
    securityCommon,
    securityUI,
    sourceSelection,
    table,
    testExecution,
    testResources,
    wizard,
  };
}
