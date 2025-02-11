/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';

import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { InfraClientStartDeps } from '../../../types';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import type { InfraWaffleMapOptions } from '../../../common/inventory/types';
import { TriggerActionsContext } from '../../../containers/triggers_actions_context';
import { useAlertPrefillContext } from '../../use_alert_prefill';

interface Props {
  visible?: boolean;
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  filter?: string;
  setVisible(val: boolean): void;
}

export const AlertFlyout = ({ options, nodeType, filter, visible, setVisible }: Props) => {
  const { services } = useKibana<CoreStart & InfraClientStartDeps>();
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const { inventoryPrefill } = useAlertPrefillContext();
  const { customMetrics = [], accountId, region } = inventoryPrefill;

  const AddAlertFlyout = useMemo(
    () => {
      if (!triggersActionsUI) return null;
      const { ruleTypeRegistry, actionTypeRegistry } = triggersActionsUI;
      return (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          consumer={'infrastructure'}
          onCancel={onCloseFlyout}
          onSubmit={onCloseFlyout}
          ruleTypeId={METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID}
          initialMetadata={{
            accountId,
            options,
            nodeType,
            filter,
            customMetrics,
            region,
          }}
          shouldUseRuleProducer
        />
      );
    },
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
