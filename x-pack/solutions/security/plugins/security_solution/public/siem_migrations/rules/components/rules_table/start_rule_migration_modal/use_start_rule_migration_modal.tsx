/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useState, useCallback } from 'react';
import { StartRuleMigrationModal } from './start_rule_migration_modal';

type UseStartMigrationModal = Omit<ComponentProps<typeof StartRuleMigrationModal>, 'onClose'> & {
  onClose?: () => void;
};

/**
 * Accompanying hook for the StartMigrationModal component.
 * Helps manage the visibility and actions related to modal.
 */
export const useStartMigrationModal = (props: UseStartMigrationModal) => {
  const { onClose: onCloseProp, ...rest } = props;
  const [isVisible, setIsVisible] = useState(false);

  const showModal = useCallback(() => {
    setIsVisible(true);
  }, []);

  const onClose = useCallback(() => {
    setIsVisible(false);
    onCloseProp?.();
  }, [onCloseProp]);

  const getModal = useCallback(() => {
    return function ModalWrapper() {
      return isVisible ? <StartRuleMigrationModal {...rest} onClose={onClose} /> : null;
    };
  }, [rest, onClose, isVisible]);

  return {
    isVisible,
    closeModal: onClose,
    showModal,
    getModal,
  };
};
