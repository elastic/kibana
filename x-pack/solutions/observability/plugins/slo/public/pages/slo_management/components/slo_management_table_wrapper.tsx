/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLODefinitionResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { SloDeleteModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloDisableConfirmationModal } from '../../../components/slo/disable_confirmation_modal/slo_disable_confirmation_modal';
import { SloEnableConfirmationModal } from '../../../components/slo/enable_confirmation_modal/slo_enable_confirmation_modal';
import { SloResetConfirmationModal } from '../../../components/slo/reset_confirmation_modal/slo_reset_confirmation_modal';
import { useCloneSlo } from '../../../hooks/use_clone_slo';
import { useDeleteSlo } from '../../../hooks/use_delete_slo';
import { useDisableSlo } from '../../../hooks/use_disable_slo';
import { useEnableSlo } from '../../../hooks/use_enable_slo';
import { useResetSlo } from '../../../hooks/use_reset_slo';
import { SloManagementTable } from './slo_management_table';

export type Action = SingleAction | BulkAction;

interface SingleAction {
  type: 'clone' | 'delete' | 'reset' | 'enable' | 'disable';
  item: SLODefinitionResponse;
}

interface BulkAction {
  type: 'bulkDelete';
  items: SLODefinitionResponse[];
}

export function SloManagementTableWrapper() {
  const [action, setAction] = useState<Action>();

  const { mutate: deleteSlo } = useDeleteSlo();
  const { mutate: resetSlo } = useResetSlo();
  const { mutate: enableSlo } = useEnableSlo();
  const { mutate: disableSlo } = useDisableSlo();
  const navigateToClone = useCloneSlo();

  function handleAction() {
    switch (action?.type) {
      case 'clone':
        return navigateToClone(action.item);
      case 'delete':
        return (
          <SloDeleteModal
            slo={action.item}
            onCancel={() => setAction(undefined)}
            onSuccess={() => {
              deleteSlo({ id: action.item.id, name: action.item.name });
              setAction(undefined);
            }}
          />
        );
      case 'reset':
        return (
          <SloResetConfirmationModal
            slo={action.item}
            onCancel={() => setAction(undefined)}
            onConfirm={() => {
              resetSlo({ id: action.item.id, name: action.item.name });
              setAction(undefined);
            }}
          />
        );
      case 'enable':
        return (
          <SloEnableConfirmationModal
            slo={action.item}
            onCancel={() => setAction(undefined)}
            onConfirm={() => {
              enableSlo({ id: action.item.id, name: action.item.name });
              setAction(undefined);
            }}
          />
        );
      case 'disable':
        return (
          <SloDisableConfirmationModal
            slo={action.item}
            onCancel={() => setAction(undefined)}
            onConfirm={() => {
              disableSlo({ id: action.item.id, name: action.item.name });
              setAction(undefined);
            }}
          />
        );
      case 'bulkDelete':
        return null;
      default:
        return null;
    }
  }

  return (
    <>
      <SloManagementTable setAction={setAction} />
      {handleAction()}
    </>
  );
}
