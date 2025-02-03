/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
} from '@elastic/eui';
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
  const { data } = useSelector(selectInspectStatusRule);
  const dispatch = useDispatch();
  const {
    services: { inspector, http },
  } = useKibana<ClientPluginsStart>();

  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

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
    <EuiCallOut iconType="search">
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.synthetics.statusRuleViz.ruleAppliesToFlexItemLabel', {
            defaultMessage: 'Rule applies to ',
          })}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            button={
              <EuiButtonEmpty
                data-test-subj="syntheticsStatusRuleVizMonitorQueryIDsButton"
                size="s"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              >
                {i18n.translate('xpack.synthetics.statusRuleViz.monitorQueryIdsPopoverButton', {
                  defaultMessage: '{total} existing monitors',
                  values: { total: data?.enabledMonitorQueryIds.length },
                })}
              </EuiButtonEmpty>
            }
          >
            <EuiPopoverTitle>
              {i18n.translate('xpack.synthetics.statusRuleViz.monitorsPopoverTitleLabel', {
                defaultMessage: 'Monitors',
              })}
            </EuiPopoverTitle>
            {i18n.translate('xpack.synthetics.statusRuleViz.ruleAppliesToFollowingPopoverLabel', {
              defaultMessage: 'Rule applies to following existing monitors:',
            })}
            <EuiSpacer size="s" />
            <EuiListGroup
              css={{ maxHeight: '300px', overflowY: 'auto' }}
              listItems={data?.monitors.map((mon) => ({
                label: mon.name,
                href: http.basePath.prepend(`/app/synthetics/monitors/${mon.id}`),
                target: '_blank',
                iconType: 'dot',
              }))}
              color="primary"
              size="s"
            />
          </EuiPopover>
        </EuiFlexItem>
        {/* to push detail button to end*/}
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsStatusRuleVizInspectButton"
            onClick={inspect}
            iconType="inspect"
            size="s"
          >
            {i18n.translate('xpack.synthetics.rules.details', {
              defaultMessage: 'Details',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
