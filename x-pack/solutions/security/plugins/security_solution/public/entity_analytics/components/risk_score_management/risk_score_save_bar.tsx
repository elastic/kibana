/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiBottomBar, EuiButtonEmpty } from '@elastic/eui';
import * as i18n from '../../translations';

export const RiskScoreSaveBar: React.FC<{
  resetSelectedSettings: () => void;
  saveSelectedSettings: () => void;
  isLoading: boolean;
}> = ({ resetSelectedSettings, saveSelectedSettings, isLoading }) => {
  return (
    <EuiBottomBar paddingSize="s" position="fixed">
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="text" size="s" iconType="cross" onClick={resetSelectedSettings}>
            {i18n.DISCARD_CHANGES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            size="s"
            iconType="check"
            onClick={saveSelectedSettings}
            isLoading={isLoading}
            data-test-subj="riskScoreSaveButton"
          >
            {i18n.SAVE_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};
