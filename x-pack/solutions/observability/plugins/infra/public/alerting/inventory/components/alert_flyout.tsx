/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';

import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { TriggerActionsContext } from '../../../containers/triggers_actions_context';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { InfraWaffleMapOptions } from '../../../common/inventory/types';
import { useAlertPrefillContext } from '../../use_alert_prefill';

interface Props {
  visible?: boolean;
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  filter?: string;
  setVisible(val: boolean): void;
}

export const AlertFlyout = ({ options, nodeType, filter, visible, setVisible }: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const { inventoryPrefill } = useAlertPrefillContext();
  const { customMetrics = [], accountId, region } = inventoryPrefill;

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getAddRuleFlyout({
        consumer: 'infrastructure',
        onClose: onCloseFlyout,
        canChangeTrigger: false,
        ruleTypeId: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
        metadata: {
          accountId,
          options,
          nodeType,
          filter,
          customMetrics,
          region,
        },
        useRuleProducer: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggersActionsUI, visible]
  );

  return <>{visible && AddAlertFlyout}</>;
};

export const PrefilledInventoryAlertFlyout = ({ onClose }: { onClose(): void }) => {
  const { inventoryPrefill } = useAlertPrefillContext();
  const { nodeType, metric, filterQuery } = inventoryPrefill;

  return (
    <AlertFlyout
      options={{ metric }}
      nodeType={nodeType}
      filter={filterQuery}
      visible
      setVisible={onClose}
    />
  );
};
