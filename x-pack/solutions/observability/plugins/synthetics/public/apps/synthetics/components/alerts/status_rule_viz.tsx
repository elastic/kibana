/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector, useDispatch } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { apiService } from '../../../../utils/api_service';
import { inspectStatusRuleAction } from '../../state/alert_rules';
import { selectInspectStatusRule } from '../../state/alert_rules/selectors';
import { StatusRuleParamsProps } from './status_rule_ui';
import { ClientPluginsStart } from '../../../../plugin';

export const StatusRuleViz = ({
  ruleParams,
}: {
  ruleParams: StatusRuleParamsProps['ruleParams'];
}) => {
  const {} = useSelector(selectInspectStatusRule);
  const dispatch = useDispatch();
  const {
    services: { inspector },
  } = useKibana<ClientPluginsStart>();

  const { inspectorAdapters, addInspectorRequest } = useInspectorContext();

  const inspect = () => {
    inspector.open(inspectorAdapters);
  };

  useEffect(() => {
    apiService.addInspectorRequest = addInspectorRequest;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    inspectorAdapters?.requests?.reset();
    dispatch(inspectStatusRuleAction.get(ruleParams));
  }, [ruleParams, dispatch, inspectorAdapters?.requests]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h2>
                  <FormattedMessage
                    id="xpack.synthetics.synthetics.alerts.statusRuleViz.title"
                    defaultMessage="Status rule visualization"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="syntheticsStatusRuleVizInspectButton"
                onClick={inspect}
                iconType="inspect"
              >
                {i18n.translate('xpack.synthetics.inspectButtonText', {
                  defaultMessage: 'Inspect',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.synthetics.synthetics.alerts.statusRuleViz.description"
              defaultMessage="This visualization shows the status of the monitors that match the rule conditions."
            />
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
