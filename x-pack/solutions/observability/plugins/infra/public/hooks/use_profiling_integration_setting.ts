/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { enableInfrastructureProfilingIntegration } from '@kbn/observability-plugin/common';
import { usePluginConfig } from '../containers/plugin_config_context';

export function useProfilingIntegrationSetting(): boolean {
  const {
    featureFlags: { profilingEnabled },
  } = usePluginConfig();
  const isProfilingUiSettingEnabled = useUiSetting<boolean>(
    enableInfrastructureProfilingIntegration
  );

  return profilingEnabled && isProfilingUiSettingEnabled;
}
