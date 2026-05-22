/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ToolsFlyoutHeader } from '../../../shared/components/tools_flyout_header';
import { ATTACK_ENTITIES_FLYOUT_TEST_ID } from '../../main/constants/test_ids';
import { AttackEntitiesDetails } from './components/attack_entities_details';

const TITLE = i18n.translate('xpack.securitySolution.flyout.attackDetails.attackEntities.title', {
  defaultMessage: 'Entities',
});

export interface AttackEntitiesProps {
  /**
   * The attack-discovery alert document this child flyout is opened from.
   * Threaded through to {@link AttackEntitiesDetails} so the
   * `useAttackEntitiesLists` / `useHeaderData` hooks can derive
   * `originalAlertIds` and `timestamp` directly from `hit.flattened`.
   */
  hit: DataTableRecord;
}

/**
 * Attack-specific Entities child flyout opened from the v2 attack details
 * Insights → Entities section. Renders the same content as the legacy
 * left-panel Entities sub-tab (`UserDetails` + `HostDetails` for users and
 * hosts attached to the attack), wrapped in a v2 tools-flyout shell.
 */
export const AttackEntities: FC<AttackEntitiesProps> = memo(({ hit }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
        data-test-subj={ATTACK_ENTITIES_FLYOUT_TEST_ID}
      >
        <ToolsFlyoutHeader hit={hit} title={TITLE} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AttackEntitiesDetails hit={hit} />
      </EuiFlyoutBody>
    </>
  );
});

AttackEntities.displayName = 'AttackEntities';
