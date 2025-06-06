/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { SiemMigrationRetryFilter } from '../../../../../common/siem_migrations/constants';
import type { StartMigration } from '../../service/hooks/use_start_migration';
import type { RuleMigrationSettings } from '../../types';

interface UseStartMigrationModal {
  startMigration: StartMigration;
  migrationId: string;
}

/**
 * Accompanying hook for the StartMigrationModal component.
 * Helps manage the visibility and actions related to modal.
 */
export const useStartMigrationModal = ({ migrationId, startMigration }: UseStartMigrationModal) => {
  const [isVisible, setIsVisible] = useState(false);

  const showStartMigrationModal = useCallback(async () => {
    setIsVisible(true);
  }, []);

  const startMigrationWithSettings = useCallback(
    (settings?: RuleMigrationSettings) => {
      setIsVisible(false);
      startMigration(migrationId, SiemMigrationRetryFilter.FAILED, settings);
    },
    [migrationId, startMigration]
  );

  const onClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    closeModal: onClose,
    showStartMigrationModal,
    startMigrationWithSettings,
  };
};
