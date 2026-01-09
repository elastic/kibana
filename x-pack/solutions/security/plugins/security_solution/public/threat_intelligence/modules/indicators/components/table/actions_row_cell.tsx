/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { MoreActions } from './more_actions';
import { InvestigateInTimelineButtonIcon } from '../../../timeline/components/investigate_in_timeline';
import { OpenIndicatorFlyoutButton } from './open_flyout_button';
import { INVESTIGATE_IN_TIMELINE_TEST_ID } from './test_ids';

export interface ActionRowCellProps {
  /**
   * The indicator data
   */
  indicator: Indicator;
}

export const ActionsRowCell = memo(({ indicator }: ActionRowCellProps) => (
  <EuiFlexGroup justifyContent="center" gutterSize="none">
    <EuiFlexItem
      grow={false}
      css={css`
        width: 28px;
      `}
    >
      <OpenIndicatorFlyoutButton indicator={indicator} />
    </EuiFlexItem>
    <EuiFlexItem
      grow={false}
      css={css`
        width: 28px;
      `}
    >
      <InvestigateInTimelineButtonIcon
        data={indicator}
        data-test-subj={INVESTIGATE_IN_TIMELINE_TEST_ID}
      />
    </EuiFlexItem>
    <EuiFlexItem
      grow={false}
      css={css`
        width: 28px;
      `}
    >
      <MoreActions indicator={indicator} />
    </EuiFlexItem>
  </EuiFlexGroup>
));

ActionsRowCell.displayName = 'ActionsRowCell';
