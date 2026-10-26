/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { cancelButtonLabel, deleteButtonLabel } from './labels';

export const ConfirmDeleteModal = ({
  title,
  children,
  confirming,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: React.ReactNode;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      title={title}
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={cancelButtonLabel()}
      confirmButtonText={deleteButtonLabel()}
      buttonColor="danger"
      isLoading={confirming}
    >
      {children}
    </EuiConfirmModal>
  );
};
