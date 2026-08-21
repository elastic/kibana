/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton } from '@elastic/eui';
import * as i18n from './translations';

interface ArtifactsVersionHistoryButtonProps {
  onClick: () => void;
}

export const ArtifactsVersionHistoryButton = memo(function ArtifactsVersionHistoryButton({
  onClick,
}: ArtifactsVersionHistoryButtonProps): JSX.Element {
  return (
    <EuiButton
      iconType="clockCounter"
      color="primary"
      onClick={onClick}
      data-test-subj="artifactsVersionHistoryButton"
    >
      {i18n.HISTORY_BUTTON_LABEL}
    </EuiButton>
  );
});
