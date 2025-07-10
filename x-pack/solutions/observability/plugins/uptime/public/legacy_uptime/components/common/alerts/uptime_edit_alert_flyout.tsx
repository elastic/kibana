/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  Rule,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { UptimeAlertTypeParams } from '../../../state/alerts/alerts';

interface Props {
  alertFlyoutVisible: boolean;
  initialAlert: Rule<UptimeAlertTypeParams>;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

type KibanaDeps = {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  fieldsMetadata: FieldsMetadataPublicStart;
} & CoreStart;

export const UptimeEditAlertFlyoutComponent = ({
  alertFlyoutVisible,
  initialAlert,
  setAlertFlyoutVisibility,
}: Props) => {
  const { triggersActionsUi, ...plugins } = useKibana<KibanaDeps>().services;

  const onClose = useCallback(() => {
    setAlertFlyoutVisibility(false);
  }, [setAlertFlyoutVisibility]);

  const EditAlertFlyout = useMemo(
    () => (
      <RuleFormFlyout
        id={initialAlert.id}
        onCancel={onClose}
        onSubmit={onClose}
        plugins={{
          ...plugins,
          ruleTypeRegistry: triggersActionsUi.ruleTypeRegistry,
          actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
        }}
      />
    ),

    [initialAlert, triggersActionsUi, onClose, plugins]
  );
  return <>{alertFlyoutVisible && EditAlertFlyout}</>;
};
