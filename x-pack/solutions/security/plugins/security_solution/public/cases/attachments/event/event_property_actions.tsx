/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AttachmentActionType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { useCasesContext } from '@kbn/cases-plugin/public/components/cases_context/use_cases_context';
import { DeleteAttachmentConfirmationModal } from '@kbn/cases-plugin/public/components/user_actions/delete_attachment_confirmation_modal';
import { UserActionPropertyActions } from '@kbn/cases-plugin/public/components/user_actions/property_actions/property_actions';
import { useDeletePropertyAction } from '@kbn/cases-plugin/public/components/user_actions/property_actions/use_delete_property_action';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
  totalEvents: number;
  onDelete: () => void;
}

const EventPropertyActionsComponent: React.FC<Props> = ({ isLoading, totalEvents, onDelete }) => {
  const { permissions } = useCasesContext();
  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete,
  });
  const buttonRef = React.useRef<HTMLAnchorElement>(null);

  const propertyActions = useMemo(() => {
    const showRemoveEventIcon = permissions.delete;

    return [
      ...(showRemoveEventIcon
        ? [
            {
              type: AttachmentActionType.BUTTON as const,
              color: 'danger' as const,
              disabled: false,
              iconType: 'minusInCircle',
              label: i18n.REMOVE_EVENTS(totalEvents),
              onClick: onModalOpen,
            },
          ]
        : []),
    ];
  }, [permissions.delete, totalEvents, onModalOpen]);

  return (
    <>
      <UserActionPropertyActions
        isLoading={isLoading}
        propertyActions={propertyActions}
        buttonRef={buttonRef}
      />
      {showDeletionModal ? (
        <DeleteAttachmentConfirmationModal
          title={i18n.REMOVE_EVENTS(totalEvents)}
          confirmButtonText={i18n.REMOVE}
          onCancel={onCancel}
          onConfirm={onConfirm}
          focusButtonRef={buttonRef}
        />
      ) : null}
    </>
  );
};

EventPropertyActionsComponent.displayName = 'EventPropertyActions';

export const EventPropertyActions = React.memo(EventPropertyActionsComponent);
