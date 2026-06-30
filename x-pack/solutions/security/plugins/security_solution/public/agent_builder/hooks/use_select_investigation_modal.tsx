/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineNonEcsData } from '../../../common/search_strategy';
import { SelectInvestigationModal } from '../components/select_investigation_modal';

export interface OpenSelectInvestigationModalParams {
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
}

export interface UseSelectInvestigationModalParams {
  onClose?: () => void;
  onSuccess?: (conversationId: string) => void;
}

export const useSelectInvestigationModal = ({
  onClose,
  onSuccess,
}: UseSelectInvestigationModalParams = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalParams, setModalParams] = useState<OpenSelectInvestigationModalParams | undefined>();

  const close = useCallback(() => {
    setIsOpen(false);
    setModalParams(undefined);
    onClose?.();
  }, [onClose]);

  const open = useCallback((params: OpenSelectInvestigationModalParams) => {
    setModalParams(params);
    setIsOpen(true);
  }, []);

  const handleSuccess = useCallback(
    (conversationId: string) => {
      onSuccess?.(conversationId);
    },
    [onSuccess]
  );

  const selectInvestigationModal = useMemo(() => {
    if (!isOpen || !modalParams) {
      return null;
    }

    return (
      <SelectInvestigationModal
        ecsData={modalParams.ecsData}
        isOpen={isOpen}
        nonEcsData={modalParams.nonEcsData}
        onClose={close}
        onSuccess={handleSuccess}
      />
    );
  }, [close, handleSuccess, isOpen, modalParams]);

  return {
    close,
    open,
    selectInvestigationModal,
  };
};
