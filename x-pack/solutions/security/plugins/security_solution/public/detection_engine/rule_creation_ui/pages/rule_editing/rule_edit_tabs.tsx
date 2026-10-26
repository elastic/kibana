/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs, EuiToolTip } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import type { RuleStep } from '../../../common/types';

export interface RuleEditTab {
  readonly id: RuleStep;
  readonly name: string;
  readonly disabled?: boolean;
  readonly tooltip?: string;
  readonly 'data-test-subj': string;
}

interface RuleEditTabsProps {
  readonly tabs: readonly RuleEditTab[];
  readonly activeStep: RuleStep;
  readonly onTabClick: (step: RuleStep) => void;
}

/** Tab bar for the rule edit page steps. */
const RuleEditTabsComponent: FC<RuleEditTabsProps> = ({ tabs, activeStep, onTabClick }) => (
  // The tooltip is rendered inside the tab so each tab stays a direct child of the tablist,
  // which lets screen readers announce the correct tab position and count.
  <EuiTabs>
    {tabs.map(({ id, name, disabled, tooltip, 'data-test-subj': dataTestSubj }) => (
      <EuiTab
        key={id}
        onClick={() => onTabClick(id)}
        isSelected={id === activeStep}
        disabled={disabled}
        data-test-subj={dataTestSubj}
      >
        {tooltip !== undefined ? (
          <EuiToolTip position="top" content={tooltip}>
            <span tabIndex={0}>{name}</span>
          </EuiToolTip>
        ) : (
          name
        )}
      </EuiTab>
    ))}
  </EuiTabs>
);

export const RuleEditTabs = memo(RuleEditTabsComponent);
RuleEditTabs.displayName = 'RuleEditTabs';
