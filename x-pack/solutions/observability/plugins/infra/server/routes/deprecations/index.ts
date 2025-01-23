/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraPluginCoreSetup } from '../../types';
import { getRuleDataSourceDeprecationInfo } from './rule_data_source_settings';

export const registerDeprecations = ({ core }: { core: InfraPluginCoreSetup }) => {
  core.deprecations.registerDeprecations({
    getDeprecations: async (context) => {
      return [
        ...(await getRuleDataSourceDeprecationInfo({
          context,
          getStartServices: core.getStartServices,
        })),
      ];
    },
  });
};
