/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useContext, useMemo } from 'react';
import { LOG_DOCUMENT_COUNT_RULE_TYPE_ID } from '../../../../common/alerting/logs/log_threshold/types';
import { TriggerActionsContext } from '../../../containers/triggers_actions_context';

interface Props {
  visible?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertFlyout = (props: Props) => {
  const { services } = useKibana();
  const { visible, setVisible } = props;
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const onCloseFlyout = useCallback(() => setVisible(false), [setVisible]);
  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUI &&
      triggersActionsUI.getRuleFormFlyout({
        plugins: services,
        consumer: 'logs',
        onSubmit: onCloseFlyout,
        onCancel: onCloseFlyout,
        ruleTypeId: LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
        initialMetadata: {
          isInternal: true,
        },
      }),
    [triggersActionsUI, services, onCloseFlyout]
  );

  return <>{visible && AddAlertFlyout}</>;
};
