/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import type { SettingsOverrideOptions } from '../../results/history/types';
import { Run } from '../run';
import { Schedule } from '../schedule';
import { Settings } from '../settings';

interface Props {
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  openFlyout: (tabId: string) => void;
}

const ActionsComponent: React.FC<Props> = ({ isLoading, onGenerate, openFlyout, isDisabled }) => {
  const { euiTheme } = useEuiTheme();

  const runSettingsGroup = css`
    display: flex;
    gap: 1px;
  `;

  const scheduleSettingsSpacing = css`
    margin-left: ${euiTheme.size.s};
  `;

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="actions" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <div css={runSettingsGroup}>
          <Run isLoading={isLoading} isDisabled={isDisabled} onGenerate={onGenerate} />
          <Settings isLoading={isLoading} openFlyout={openFlyout} />
        </div>
      </EuiFlexItem>

      <EuiFlexItem css={scheduleSettingsSpacing} grow={false}>
        <Schedule isLoading={isLoading} openFlyout={openFlyout} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ActionsComponent.displayName = 'Actions';

export const Actions = React.memo(ActionsComponent);
