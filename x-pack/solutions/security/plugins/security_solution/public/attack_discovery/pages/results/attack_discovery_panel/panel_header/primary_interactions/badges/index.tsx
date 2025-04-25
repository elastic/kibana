/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AttackDiscovery, type AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { isAttackDiscoveryAlert } from '../../../../../utils/is_attack_discovery_alert';
import { SharedBadge } from './shared_badge';
import { WorkflowBadge } from './workflow_badge';

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
}

const BadgesComponent: React.FC<Props> = ({ attackDiscovery }) => {
  const { euiTheme } = useEuiTheme();

  return isAttackDiscoveryAlert(attackDiscovery) ? (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        gap: ${euiTheme.size.xs};
      `}
      data-test-subj="badges"
      gutterSize="none"
      responsive={false}
      wrap={true}
    >
      <EuiFlexItem grow={false}>
        <WorkflowBadge attackDiscovery={attackDiscovery} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SharedBadge attackDiscovery={attackDiscovery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};

BadgesComponent.displayName = 'Badges';

export const Badges = React.memo(BadgesComponent);
