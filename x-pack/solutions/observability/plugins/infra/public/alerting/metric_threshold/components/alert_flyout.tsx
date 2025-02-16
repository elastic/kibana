/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import React, { useCallback, useContext, useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { InfraClientStartDeps } from '../../../types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import type { MetricsExplorerSeries } from '../../../../common/http_api/metrics_explorer';
import { TriggerActionsContext } from '../../../containers/triggers_actions_context';
import type { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useAlertPrefillContext } from '../../use_alert_prefill';

interface Props {
  visible?: boolean;
  options?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertFlyout = (props: Props) => {
  const { services } = useKibana<CoreStart & InfraClientStartDeps>();
  const { visible, setVisible } = props;
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);

  const AddAlertFlyout = useMemo(
    () => {
      if (!triggersActionsUI) return null;
      const { ruleTypeRegistry, actionTypeRegistry } = triggersActionsUI;
      return (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          consumer="infrastructure"
          onCancel={onCloseFlyout}
          onSubmit={onCloseFlyout}
          ruleTypeId={METRIC_THRESHOLD_ALERT_TYPE_ID}
          initialMetadata={{
            currentOptions: props.options,
            series: props.series,
          }}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggersActionsUI, onCloseFlyout]
  );

  return <>{visible && AddAlertFlyout}</>;
};

export const PrefilledMetricThresholdAlertFlyout = ({ onClose }: { onClose(): void }) => {
  const { metricThresholdPrefill } = useAlertPrefillContext();
  const { groupBy, filterQuery, metrics } = metricThresholdPrefill;

  return <AlertFlyout options={{ groupBy, filterQuery, metrics }} visible setVisible={onClose} />;
};
