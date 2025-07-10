/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import { TLSRuleComponent } from '../../../components/alerts/tls_rule_ui';
import { ClientPluginsStart } from '../../../../../plugin';
import { kibanaService } from '../../../../../utils/kibana_service';
import { getSyntheticsAppProps } from '../../../render_app';
import { SyntheticsSharedContext } from '../../../contexts/synthetics_shared_context';

interface Props {
  coreStart: CoreStart;
  plugins: ClientPluginsStart;
  ruleParams: RuleTypeParamsExpressionProps<TLSRuleParams>['ruleParams'];
  setRuleParams: RuleTypeParamsExpressionProps<TLSRuleParams>['setRuleParams'];
}

// eslint-disable-next-line import/no-default-export
export default function TLSAlert({ coreStart, plugins, ruleParams, setRuleParams }: Props) {
  kibanaService.coreStart = coreStart;
  const props = getSyntheticsAppProps();

  return (
    <SyntheticsSharedContext {...props}>
      <TLSRuleComponent ruleParams={ruleParams} setRuleParams={setRuleParams} />
    </SyntheticsSharedContext>
  );
}
