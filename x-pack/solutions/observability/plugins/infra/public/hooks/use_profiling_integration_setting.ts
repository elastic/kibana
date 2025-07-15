/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { InfraClientCoreStart } from '../types';
export function useProfilingPluginSetting() {
  const { capabilities } = useKibana<InfraClientCoreStart>().services.application;

  return Boolean(capabilities.profiling?.show);
}
