/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useEffect } from 'react';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public/types';

interface CaseModalProps {
  services: any;
  Kibana;
  attachments: CaseAttachmentsWithoutOwner;
  onClose: () => void;
  onSuccess: (result: { updatedAt?: string }) => void;
}

function CaseModal({
  services,
  attachments,
  onClose,
  onSuccess,
}: CaseModalProps): React.ReactElement | null {
  const selectCaseModal = services.cases?.hooks.useCasesAddToExistingCaseModal({
    onSuccess,
  });

  useEffect(() => {
    if (selectCaseModal) {
      selectCaseModal.open({ getAttachments: () => attachments });
    }

    return () => {
      onClose();
    };
  }, [selectCaseModal, attachments, onClose]);

  return null;
}

// eslint-disable-next-line import/no-default-export
export default CaseModal;
