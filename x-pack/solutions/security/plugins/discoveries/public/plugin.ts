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

const ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG =
  'securitySolution.attackDiscoveryWorkflowsEnabled';

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
    core: CoreSetup<DiscoveriesPublicPluginStartDeps, DiscoveriesPublicPluginStart>,
    plugins: DiscoveriesPublicPluginSetupDeps
  ): DiscoveriesPublicPluginSetup {
    // Register each AD step as a feature-flag-gated loader. The Workflows step
    // registry resolves the loader (after start, when the flag is readable);
    // resolving `undefined` skips registration, so the AD step types do not
    // appear in the Workflows UI catalog while the flag is OFF.
    const gate =
      <T>(definition: T) =>
      async (): Promise<T | undefined> => {
        const [coreStart] = await core.getStartServices();
        const enabled = await coreStart.featureFlags.getBooleanValue(
          ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG,
          true
        );
        return enabled ? definition : undefined;
      };

    plugins.workflowsExtensions.registerStepDefinition(
      gate(defaultAlertRetrievalStepPublicDefinition)
    );
    plugins.workflowsExtensions.registerStepDefinition(gate(defaultValidationStepPublicDefinition));
    plugins.workflowsExtensions.registerStepDefinition(gate(generateStepPublicDefinition));
    plugins.workflowsExtensions.registerStepDefinition(
      gate(persistDiscoveriesStepPublicDefinition)
    );
    plugins.workflowsExtensions.registerStepDefinition(gate(runStepPublicDefinition));

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
