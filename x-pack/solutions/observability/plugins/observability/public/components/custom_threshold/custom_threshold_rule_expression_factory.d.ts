import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityPublicPluginsStart } from '../../plugin';
import type { CustomThresholdRuleExpressionProps } from './custom_threshold_rule_expression';
export type GetStartServices = () => Promise<[CoreStart, ObservabilityPublicPluginsStart, unknown]>;
export declare const createCustomThresholdRuleExpression: (getStartServices: GetStartServices) => React.ForwardRefExoticComponent<Omit<CustomThresholdRuleExpressionProps, "kql"> & React.RefAttributes<{}>>;
