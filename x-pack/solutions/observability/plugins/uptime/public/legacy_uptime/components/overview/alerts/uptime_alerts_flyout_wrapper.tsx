/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { RuleFormFlyoutLazy } from '@kbn/response-ops-rule-form/lazy';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { CoreStart } from '@kbn/core/public';

interface Props {
  alertFlyoutVisible: boolean;
  alertTypeId?: string;
  setAlertFlyoutVisibility: (value: boolean) => void;
}

type KibanaDeps = {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
} & CoreStart;

export const UptimeAlertsFlyoutWrapperComponent = ({
  alertFlyoutVisible,
  alertTypeId,
  setAlertFlyoutVisibility,
}: Props) => {
  const {
    triggersActionsUi: { actionTypeRegistry, ruleTypeRegistry },
    ...plugins
  } = useKibana<KibanaDeps>().services;
  const onCloseAlertFlyout = useCallback(
    () => setAlertFlyoutVisibility(false),
    [setAlertFlyoutVisibility]
  );
  const AddAlertFlyout = useMemo(
    () => (
      <RuleFormFlyoutLazy
        plugins={{ ...plugins, ruleTypeRegistry, actionTypeRegistry }}
        consumer="uptime"
        onCancel={onCloseAlertFlyout}
        onSubmit={onCloseAlertFlyout}
        ruleTypeId={alertTypeId}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCloseAlertFlyout, alertTypeId]
  );

  return <>{alertFlyoutVisible && AddAlertFlyout}</>;
};
