/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { BurnRateRuleParams } from '../../../../typings';
import { SloItemActions } from '../slo_item_actions';

interface Props {
  slo: SLOWithSummaryResponse;
  isActionsPopoverOpen: boolean;
  setIsActionsPopoverOpen: (value: boolean) => void;
  setIsAddRuleFlyoutOpen: (value: boolean) => void;
  setIsEditRuleFlyoutOpen: (value: boolean) => void;
  setDashboardAttachmentReady: (value: boolean) => void;
  rules?: Array<Rule<BurnRateRuleParams>>;
}

export function SloCardItemActions(props: Props) {
  return (
    <div
      css={({ euiTheme }) => css`
        display: inline-block;
        position: relative;
        bottom: ${euiTheme.size.xxl};
        left: ${euiTheme.size.m};
        z-index: 1;
      `}
    >
      <SloItemActions
        {...props}
        btnProps={{
          iconType: 'boxesVertical',
          color: 'primary',
          display: 'empty',
        }}
      />
    </div>
  );
}
