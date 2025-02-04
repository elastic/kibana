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
import { UptimeAlertTypeParams } from '../../../state/alerts/alerts';

interface Props {
  alertFlyoutVisible: boolean;
  initialAlert: Rule<UptimeAlertTypeParams>;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

interface KibanaDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

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
    () =>
      triggersActionsUi.getRuleFormFlyout({
        id: initialAlert.id,
        onCancel: onClose,
        onSubmit: onClose,
        plugins,
      }),
    [initialAlert, triggersActionsUi, onClose, plugins]
  );
  return <>{alertFlyoutVisible && EditAlertFlyout}</>;
};
