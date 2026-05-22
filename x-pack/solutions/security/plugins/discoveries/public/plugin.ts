/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { DIAGNOSTIC_REPORT_ATTACHMENT_TYPE } from '../common/constants';
import type {
  DiscoveriesPublicPluginSetup,
  DiscoveriesPublicPluginSetupDeps,
  DiscoveriesPublicPluginStart,
  DiscoveriesPublicPluginStartDeps,
} from './types';
import {
  defaultAlertRetrievalStepPublicDefinition,
  defaultValidationStepPublicDefinition,
  generateStepPublicDefinition,
  persistDiscoveriesStepPublicDefinition,
  runStepPublicDefinition,
} from './step_types';

export class DiscoveriesPublicPlugin
  implements
    Plugin<
      DiscoveriesPublicPluginSetup,
      DiscoveriesPublicPluginStart,
      DiscoveriesPublicPluginSetupDeps,
      DiscoveriesPublicPluginStartDeps
    >
{
  constructor(_context: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<DiscoveriesPublicPluginStartDeps, DiscoveriesPublicPluginStart>,
    plugins: DiscoveriesPublicPluginSetupDeps
  ): DiscoveriesPublicPluginSetup {
    plugins.workflowsExtensions.registerStepDefinition(defaultAlertRetrievalStepPublicDefinition);
    plugins.workflowsExtensions.registerStepDefinition(defaultValidationStepPublicDefinition);
    plugins.workflowsExtensions.registerStepDefinition(generateStepPublicDefinition);
    plugins.workflowsExtensions.registerStepDefinition(persistDiscoveriesStepPublicDefinition);
    plugins.workflowsExtensions.registerStepDefinition(runStepPublicDefinition);

    return {};
  }

  public start(
    _core: CoreStart,
    plugins: DiscoveriesPublicPluginStartDeps
  ): DiscoveriesPublicPluginStart {
    plugins.agentBuilder?.attachments.addAttachmentType(DIAGNOSTIC_REPORT_ATTACHMENT_TYPE, {
      getIcon: () => 'document',
      getLabel: () =>
        i18n.translate('xpack.discoveries.attachments.diagnosticReport.label', {
          defaultMessage: 'Diagnostic report',
        }),
    });

    return {};
  }

  public stop() {}
}
