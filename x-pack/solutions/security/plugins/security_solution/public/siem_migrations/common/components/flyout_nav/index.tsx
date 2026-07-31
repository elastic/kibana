/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { PREVIOUS_BUTTON_LABEL, NEXT_BUTTON_LABEL } from '../details_flyout/translation';

export * from './use_migration_flyout_nav';

export interface MigrationFlyoutNavigation {
  hasPrevious: boolean;
  hasNext: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
}

export interface MigrationFlyoutNavProps {
  navigation: MigrationFlyoutNavigation;
  isDisabled: boolean;
}

export const MigrationFlyoutNav = React.memo(function MigrationFlyoutNav({
  navigation,
  isDisabled,
}: MigrationFlyoutNavProps) {
  const { hasPrevious, hasNext, goToPrevious, goToNext } = navigation;
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={PREVIOUS_BUTTON_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="arrowLeft"
            color="text"
            display="base"
            size="s"
            isDisabled={!hasPrevious || isDisabled}
            onClick={goToPrevious}
            data-test-subj="migrationFlyoutPreviousButton"
            aria-label={PREVIOUS_BUTTON_LABEL}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={NEXT_BUTTON_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="arrowRight"
            color="text"
            display="base"
            size="s"
            isDisabled={!hasNext || isDisabled}
            onClick={goToNext}
            data-test-subj="migrationFlyoutNextButton"
            aria-label={NEXT_BUTTON_LABEL}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
