import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { BurnRateRuleParams } from '../../typings';
import type { ValidationBurnRateRuleResult } from './validation';
type Props = Pick<RuleTypeParamsExpressionProps<BurnRateRuleParams>, 'ruleParams' | 'setRuleParams' | 'id'> & ValidationBurnRateRuleResult;
export declare function BurnRateRuleEditor(props: Props): React.JSX.Element;
export {};
