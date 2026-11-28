/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import * as i18n from './translations';
import type { MigrationStats } from '../../types';

export interface StartTranslationButtonProps<
  T extends Pick<MigrationStats, 'id'> = MigrationStats
> {
  migrationStats: T;
  isStopped: boolean;
  startMigration: (migrationStats: T) => void;
  isStarting: boolean;
}

const StartTranslationButtonComponent = <T extends Pick<MigrationStats, 'id'> = MigrationStats>({
  migrationStats,
  isStopped,
  startMigration,
  isStarting,
}: StartTranslationButtonProps<T>) => {
  const onStartMigration = useCallback(() => {
    startMigration(migrationStats);
  }, [migrationStats, startMigration]);

  const text = useMemo(() => {
    if (isStopped) {
      return isStarting
        ? i18n.MIGRATION_RESUMING_TRANSLATION_BUTTON
        : i18n.MIGRATION_RESUME_TRANSLATION_BUTTON;
    } else {
      return isStarting
        ? i18n.MIGRATION_STARTING_TRANSLATION_BUTTON
        : i18n.MIGRATION_START_TRANSLATION_BUTTON;
    }
  }, [isStopped, isStarting]);

  return (
    <EuiButton
      data-test-subj={'startMigrationButton'}
      aria-label={text}
      fill={!isStopped}
      onClick={onStartMigration}
      isLoading={isStarting}
      size="s"
    >
      {text}
    </EuiButton>
  );
};

// `React.memo` loses the generic type parameter, restore it
export const StartTranslationButton = React.memo(
  StartTranslationButtonComponent
) as typeof StartTranslationButtonComponent;

(StartTranslationButton as React.FC).displayName = 'StartTranslationButton';
