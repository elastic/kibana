/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useContext, useMemo } from 'react';
import type { InfraClientStartDeps } from '../../../types';
import { TriggerActionsContext } from '../../../containers/triggers_actions_context';

interface Props {
  onClose: () => void;
}

export function AlertFlyout({ onClose }: Props) {
  const { services } = useKibana<InfraClientStartDeps>();
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  const addAlertFlyout = useMemo(() => {
    if (!triggersActionsUI) {
      return null;
    }

    return triggersActionsUI.getRuleFormFlyout({
      plugins: services,
      consumer: 'infrastructure',
      onCancel: onClose,
      onSubmit: onClose,
      ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
      initialMetadata: {
        currentOptions: {
          /*
          Setting the groupBy is currently required in custom threshold
          rule for it to populate the rule with additional host context.
          */
          groupBy: 'host.name',
        },
      },
    });
  }, [onClose, triggersActionsUI, services]);

  return addAlertFlyout;
}
