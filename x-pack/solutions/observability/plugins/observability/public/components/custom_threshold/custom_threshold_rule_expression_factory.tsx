/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityPublicPluginsStart } from '../../plugin';
import type { CustomThresholdRuleExpressionProps } from './custom_threshold_rule_expression';

export type GetStartServices = () => Promise<[CoreStart, ObservabilityPublicPluginsStart, unknown]>;

export const createCustomThresholdRuleExpression = (getStartServices: GetStartServices) => {
  // Use dynamic() to lazily load the component, allowing us to asynchronously
  // fetch the KQL service from start dependencies before rendering.
  // This is needed because rule types are registered during the setup phase,
  // but KqlPluginStart is only available during the start phase.
  return dynamic(async () => {
    const kql = await getStartServices().then(([, pluginsStart]) => pluginsStart.kql);
    const { default: Expressions } = await import('./custom_threshold_rule_expression');
    return {
      default: (props: Omit<CustomThresholdRuleExpressionProps, 'kql'>) => (
        <Expressions {...props} kql={kql} />
      ),
    };
  });
};
