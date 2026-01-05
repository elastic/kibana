/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { WorkplaceAIAppPluginStartDependencies } from '../../types';

export type StartServices = CoreStart & {
  plugins: WorkplaceAIAppPluginStartDependencies;
};

const useTypedKibana = () => useKibana<StartServices>();

export { useTypedKibana as useKibana };
