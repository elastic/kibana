/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import { StatusRuleComponent } from '../../../components/alerts/status_rule_ui';
import { kibanaService } from '../../../../../utils/kibana_service';
import { ClientPluginsStart } from '../../../../../plugin';
import { store } from '../../../state';

interface Props {
  coreStart: CoreStart;
  plugins: ClientPluginsStart;
  params: RuleTypeParamsExpressionProps<StatusRuleParams>;
}

// eslint-disable-next-line import/no-default-export
export default function MonitorStatusAlert({ coreStart, plugins, params }: Props) {
  kibanaService.coreStart = coreStart;
  const queryClient = new QueryClient();
  const { ruleParams } = params;
  return (
    <InspectorContextProvider>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={{ ...coreStart, ...plugins }}>
            {params.id && isEmpty(ruleParams) && (
              <EuiText>
                <FormattedMessage
                  id="xpack.synthetics.alertRule.monitorStatus.description"
                  defaultMessage="Manage synthetics monitor status rule actions."
                />
              </EuiText>
            )}

            {(!params.id || !isEmpty(ruleParams)) && (
              <StatusRuleComponent ruleParams={ruleParams} setRuleParams={params.setRuleParams} />
            )}

            <EuiSpacer size="m" />
          </KibanaContextProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </InspectorContextProvider>
  );
}
