/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopoverTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useSelector, useDispatch } from 'react-redux-v7';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import type { PayloadAction } from 'redux-toolkit-v1';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { RuleMonitorsTable } from './rule_monitors_table';
import { apiService } from '../../../../utils/api_service';
import { selectInspectRule } from '../../state/alert_rules/selectors';
import type { ClientPluginsStart } from '../../../../plugin';

export const RuleViz = ({ dispatchedAction }: { dispatchedAction: PayloadAction<unknown> }) => {
  const { data, loading } = useSelector(selectInspectRule);
  const dispatch = useDispatch();
  const {
    services: { inspector, uiSettings },
  } = useKibana<ClientPluginsStart>();

  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const ruleVizPopoverTitleId = useGeneratedHtmlId();

  const { inspectorAdapters, addInspectorRequest } = useInspectorContext();

  const isInspectorEnabled = uiSettings.get<boolean>(enableInspectEsQueries);

  const inspect = () => {
    inspector.open(inspectorAdapters);
  };

  useEffect(() => {
    apiService.addInspectorRequest = addInspectorRequest;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    inspectorAdapters?.requests?.reset();
    dispatch(dispatchedAction);
  }, [dispatchedAction, dispatch, inspectorAdapters?.requests]);

  return (
    <KbnInfoCallout
      title={
        <EuiFlexGroup alignItems="center" gutterSize="s" css={{ display: 'inline-flex' }}>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.synthetics.statusRuleViz.ruleAppliesToFlexItemLabel', {
              defaultMessage:
                'Rule applies to {total} existing {total, plural, one {monitor} other {monitors}}',
              values: { total: data?.monitors.length },
            })}
          </EuiFlexItem>
          {loading && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      size="s"
      actionProps={{
        primary: {
          children: i18n.translate('xpack.synthetics.statusRuleViz.monitorQueryIdsPopoverButton', {
            defaultMessage: 'View monitors',
          }),
          'data-test-subj': 'syntheticsStatusRuleVizMonitorQueryIDsButton',
          disabled: loading,
          onClick: () => setIsPopoverOpen(!isPopoverOpen),
          popoverProps: {
            isOpen: isPopoverOpen,
            closePopover: () => setIsPopoverOpen(false),
            'aria-labelledby': ruleVizPopoverTitleId,
            children: (
              <>
                <EuiPopoverTitle id={ruleVizPopoverTitleId}>
                  {i18n.translate('xpack.synthetics.statusRuleViz.monitorsPopoverTitleLabel', {
                    defaultMessage: 'Monitors',
                  })}
                </EuiPopoverTitle>
                {i18n.translate(
                  'xpack.synthetics.statusRuleViz.ruleAppliesToFollowingPopoverLabel',
                  {
                    defaultMessage: 'Rule applies to following existing monitors.',
                  }
                )}
                <EuiSpacer size="s" />
                <RuleMonitorsTable />
              </>
            ),
          },
        },
        secondary: {
          children: i18n.translate('xpack.synthetics.rules.details', {
            defaultMessage: 'Details',
          }),
          'data-test-sub': 'syntheticsRuleVizInspectButton',
          disabled: !isInspectorEnabled,
          iconType: 'inspect',
          onClick: inspect,
          tooltipProps: !isInspectorEnabled
            ? {
                content: inspectorDisabledTooltip,
              }
            : undefined,
        },
      }}
    />
  );
};

const inspectorDisabledTooltip = i18n.translate('xpack.synthetics.rules.inspectorDisabled', {
  defaultMessage: 'Enable "Inspect ES queries" in Advanced Settings to see Details',
});
