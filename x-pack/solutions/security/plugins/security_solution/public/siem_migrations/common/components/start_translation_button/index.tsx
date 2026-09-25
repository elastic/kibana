/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { MigrationsServiceTaskStats } from '../../service/migrations_service_base';
import * as i18n from './translations';

export interface StartTranslationButtonProps {
  migrationStats: MigrationsServiceTaskStats;
  isStopped: boolean;
  startMigration: () => void;
  isStarting: boolean;
}

export const StartTranslationButton = React.memo<StartTranslationButtonProps>(
  ({ isStopped, startMigration, isStarting }) => {
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
        onClick={startMigration}
        isLoading={isStarting}
        size="s"
      >
        {text}
      </EuiButton>
    );
  }
);

StartTranslationButton.displayName = 'StartTranslationButton';
