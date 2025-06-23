/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { ReactNode, createContext, useContext, useState } from 'react';
import { SloBulkDeleteConfirmationModal } from '../components/slo/bulk_delete_confirmation_modal/bulk_delete_confirmation_modal';
import { SloDeleteConfirmationModal } from '../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloDisableConfirmationModal } from '../components/slo/disable_confirmation_modal/slo_disable_confirmation_modal';
import { SloEnableConfirmationModal } from '../components/slo/enable_confirmation_modal/slo_enable_confirmation_modal';
import { SloResetConfirmationModal } from '../components/slo/reset_confirmation_modal/slo_reset_confirmation_modal';
import { useCloneSlo } from '../hooks/use_clone_slo';
import { BulkPurgeConfirmationContainer } from '../components/slo/purge_confirmation_modal/bulk_purge_modal_container';
import { PurgeConfirmationContainer } from '../components/slo/purge_confirmation_modal/purge_modal_container';

type Action = SingleAction | BulkAction;

interface BaseAction {
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface SingleAction extends BaseAction {
  type: 'clone' | 'delete' | 'reset' | 'enable' | 'disable' | 'purge';
  item: SLODefinitionResponse | SLOWithSummaryResponse;
}

interface BulkAction extends BaseAction {
  type: 'bulk_delete' | 'bulk_purge';
  items: SLODefinitionResponse[];
}

interface ActionModalContextValue {
  triggerAction: (action: Action) => void;
}

const ActionModalContext = createContext<ActionModalContextValue | undefined>(undefined);

export function ActionModalProvider({ children }: { children: ReactNode }) {
  const [action, triggerAction] = useState<Action>();

  const navigateToClone = useCloneSlo();

  function handleOnCancel() {
    triggerAction(undefined);
    action?.onCancel?.();
  }

  function handleOnConfirm() {
    triggerAction(undefined);
    action?.onConfirm?.();
  }

  function handleAction() {
    switch (action?.type) {
      case 'clone':
        navigateToClone(action.item);
        return;
      case 'delete':
        return (
          <SloDeleteConfirmationModal
            slo={action.item}
            onCancel={handleOnCancel}
            onConfirm={handleOnConfirm}
          />
        );

      case 'reset':
        return (
          <SloResetConfirmationModal
            slo={action.item}
            onCancel={handleOnCancel}
            onConfirm={handleOnConfirm}
          />
        );
      case 'enable':
        return (
          <SloEnableConfirmationModal
            slo={action.item}
            onCancel={handleOnCancel}
            onConfirm={handleOnConfirm}
          />
        );
      case 'disable':
        return (
          <SloDisableConfirmationModal
            slo={action.item}
            onCancel={handleOnCancel}
            onConfirm={handleOnConfirm}
          />
        );
      case 'purge':
        return (
          <PurgeConfirmationContainer
            item={action.item}
            onCancel={handleOnCancel}
            onConfirm={handleOnConfirm}
          />
        );
      case 'bulk_delete':
        return (
          <SloBulkDeleteConfirmationModal
            items={action.items}
            onCancel={handleOnCancel}
            onConfirm={handleOnConfirm}
          />
        );
      case 'bulk_purge':
        return (
          <BulkPurgeConfirmationContainer
            items={action.items}
            onCancel={handleOnCancel}
            onConfirm={handleOnConfirm}
          />
        );
      default:
        return null;
    }
  }

  return (
    <ActionModalContext.Provider value={{ triggerAction }}>
      {children}
      {handleAction()}
    </ActionModalContext.Provider>
  );
}

export function useActionModal() {
  const context = useContext(ActionModalContext);
  if (!context) {
    throw new Error('useActionModal must be used within an ActionModalProvider');
  }
  return context;
}
