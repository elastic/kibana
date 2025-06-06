/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useState, useCallback } from 'react';
import { StartMigrationModal } from './start_migration_modal';

type UseStartMigrationModal = Omit<ComponentProps<typeof StartMigrationModal>, 'onClose'> & {
  onClose?: () => void;
};

/**
 * Accompanying hook for the StartMigrationModal component.
 * Helps manage the visibility and actions related to modal.
 */
export const useStartMigrationModal = ({
  lastConnectorId,
  skipPrebuiltRulesMatching = false,
  onClose: onCloseProp,
  onStartMigrationWithSettings,
  numberOfRules = 0,
  availableConnectors,
}: UseStartMigrationModal) => {
  const [isVisible, setIsVisible] = useState(false);

  const showStartMigrationModal = useCallback(async () => {
    setIsVisible(true);
  }, []);

  const onClose = useCallback(() => {
    setIsVisible(false);
    onCloseProp?.();
  }, [onCloseProp]);

  const getModal = useCallback(() => {
    return function ModalWrapper() {
      return isVisible ? (
        <StartMigrationModal
          lastConnectorId={lastConnectorId}
          skipPrebuiltRulesMatching={skipPrebuiltRulesMatching}
          onClose={onClose}
          onStartMigrationWithSettings={onStartMigrationWithSettings}
          numberOfRules={numberOfRules}
          availableConnectors={availableConnectors}
        />
      ) : null;
    };
  }, [
    lastConnectorId,
    skipPrebuiltRulesMatching,
    onClose,
    onStartMigrationWithSettings,
    numberOfRules,
    availableConnectors,
    isVisible,
  ]);

  return {
    isVisible,
    closeModal: onClose,
    showStartMigrationModal,
    getModal,
  };
};
