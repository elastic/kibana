/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiSelect } from '@elastic/eui';
import { BaseActionModal } from './base_action_modal';
import { MODAL_TRANSLATIONS } from './translations';

export interface AssignActionModalProps {
  recordId: string;
  initialAssignee?: string | null;
  onClose: () => void;
  onAssign: (assignee: string, rationale: string) => void;
}

export const AssignActionModal = memo<AssignActionModalProps>(
  ({ recordId, initialAssignee, onClose, onAssign }) => {
    const [assignee, setAssignee] = useState(initialAssignee ?? '');
    const [hasBeenTouched, setHasBeenTouched] = useState(false);

    // TODO: replace with API-fetched assignees
    const assignOptions = useMemo(
      () => [
        { value: '', text: 'Select an assignee' },
        { value: 'ava', text: 'Ava' },
        { value: 'benjamin', text: 'Benjamin' },
        { value: 'chloe', text: 'Chloe' },
        { value: 'daniel', text: 'Daniel' },
        { value: 'emma', text: 'Emma' },
        { value: 'felix', text: 'Felix' },
      ],
      []
    );

    const onChangeAssignee = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      setAssignee(event.target.value);
      setHasBeenTouched(true);
    }, []);

    return (
      <BaseActionModal
        type="assign"
        title={MODAL_TRANSLATIONS.assign.title}
        recordId={recordId}
        hasAssigneeError={assignee === ''}
        onClose={onClose}
        rationalePlaceholder={MODAL_TRANSLATIONS.assign.rationalePlaceholder}
        primaryAction={{
          color: 'primary',
          label: MODAL_TRANSLATIONS.assign.actionButtonLabel,
          onClick: (rationale) => onAssign(assignee, rationale),
        }}
      >
        <EuiSelect
          fullWidth
          isInvalid={hasBeenTouched && assignee === ''}
          aria-label={MODAL_TRANSLATIONS.assign.assigneeSelectAriaLabel}
          options={assignOptions}
          value={assignee}
          onChange={onChangeAssignee}
          onBlur={() => setHasBeenTouched(true)}
        />
      </BaseActionModal>
    );
  }
);

AssignActionModal.displayName = 'AssignActionModal';
