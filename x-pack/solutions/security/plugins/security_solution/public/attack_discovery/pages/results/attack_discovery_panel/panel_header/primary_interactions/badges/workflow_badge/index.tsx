/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AttackDiscovery, type AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { isAttackDiscoveryAlert } from '../../../../../../utils/is_attack_discovery_alert';

const NON_I18N_WORKFLOW_STATUS_FIELD_NAME = 'kibana.alert.workflow_status'; // intentionally not i18n

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
}

const WorkflowBadgeComponent: React.FC<Props> = ({ attackDiscovery }) => {
  if (isAttackDiscoveryAlert(attackDiscovery) && attackDiscovery.alertWorkflowStatus != null) {
    const { alertWorkflowStatus } = attackDiscovery;

    return (
      <EuiToolTip
        content={NON_I18N_WORKFLOW_STATUS_FIELD_NAME}
        data-test-subj="workflowBadgeTooltip"
      >
        <EuiBadge
          aria-label={NON_I18N_WORKFLOW_STATUS_FIELD_NAME}
          color="hollow"
          data-test-subj="workflowBadge"
        >
          <span
            css={css`
              text-transform: capitalize;
            `}
          >
            {alertWorkflowStatus}
          </span>
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return null;
};

WorkflowBadgeComponent.displayName = 'WorkflowBadge';

export const WorkflowBadge = React.memo(WorkflowBadgeComponent);
