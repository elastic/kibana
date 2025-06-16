/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { useContext, useMemo } from 'react';
import type { InfraClientStartDeps } from '../../../types';
import { TriggerActionsContext } from '../../../containers/triggers_actions_context';

interface Props {
  onClose: () => void;
}

export function AlertFlyout({ onClose }: Props) {
  const { services } = useKibana<CoreStart & InfraClientStartDeps>();
  const { triggersActionsUI } = useContext(TriggerActionsContext);

  const addAlertFlyout = useMemo(() => {
    if (!triggersActionsUI) {
      return null;
    }

    const { ruleTypeRegistry, actionTypeRegistry } = triggersActionsUI;

    return (
      <RuleFormFlyout
        plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
        consumer={'infrastructure'}
        onCancel={onClose}
        onSubmit={onClose}
        ruleTypeId={OBSERVABILITY_THRESHOLD_RULE_TYPE_ID}
        initialMetadata={{
          currentOptions: {
            /*
          Setting the groupBy is currently required in custom threshold
          rule for it to populate the rule with additional host context.
          */
            groupBy: 'host.name',
          },
        }}
      />
    );
  }, [onClose, triggersActionsUI, services]);

  return addAlertFlyout;
}
