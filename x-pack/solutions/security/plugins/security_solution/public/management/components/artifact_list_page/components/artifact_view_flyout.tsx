/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlyout, EuiFlyoutBody, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ArtifactViewFlyoutProps {
  onClose: () => void;
  'data-test-subj'?: string;
}

const artifactViewFlyoutAriaLabel = i18n.translate(
  'xpack.securitySolution.artifactListPage.viewFlyoutAriaLabel',
  { defaultMessage: 'Artifact details' }
);

export const ArtifactViewFlyout = memo<ArtifactViewFlyoutProps>(
  ({ onClose, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const maskProps = useMemo(
      () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 4}` }),
      [euiTheme.levels.flyout]
    );

    return (
      <EuiFlyout
        session="never"
        onClose={onClose}
        data-test-subj={dataTestSubj}
        aria-label={artifactViewFlyoutAriaLabel}
        maskProps={maskProps}
      >
        <EuiFlyoutBody />
      </EuiFlyout>
    );
  }
);
ArtifactViewFlyout.displayName = 'ArtifactViewFlyout';
