/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionType, HostRef } from './types';

interface ConfirmationCardProps {
  hostRef: HostRef;
  actionType: ActionType;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  hostRef,
  actionType,
  onConfirm,
  onCancel,
}) => {
  return (
    <div data-test-subj="endpoint-response-action-confirmation">
      <p>Confirm {actionType} for {hostRef.hostName}?</p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};
