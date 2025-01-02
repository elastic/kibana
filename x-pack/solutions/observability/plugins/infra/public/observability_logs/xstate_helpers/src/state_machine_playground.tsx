/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';

export const StateMachinePlayground = () => {
  const { changeLogViewReference, revertToDefaultLogView, update, isLoading, logViewStateService } =
    useLogViewContext();

  const switchToInlineLogView = useCallback(() => {
    changeLogViewReference({
      type: 'log-view-inline',
      id: 'playground-log-view',
      attributes: {
        name: 'playground-log-view-name',
        description: 'from the state machine playground',
        logIndices: { type: 'index_name', indexName: 'logs-*' },
        logColumns: [
          {
            fieldColumn: {
              id: 'playground-field-column',
              field: 'event.dataset',
            },
          },
        ],
      },
    });
  }, [changeLogViewReference]);

  const updateLogView = useCallback(() => {
    update({
      name: 'Updated playground name',
    });
  }, [update]);

  const persistInlineLogView = useCallback(() => {
    logViewStateService.send({
      type: 'PERSIST_INLINE_LOG_VIEW',
    });
  }, [logViewStateService]);

  return (
    <>
      {isLoading && 'Is loading'}
      <EuiButton
        data-test-subj="infraStateMachinePlaygroundButton"
        fill
        onClick={() => switchToInlineLogView()}
      >
        {'Switch to inline Log View'}
      </EuiButton>
      <EuiButton
        data-test-subj="infraStateMachinePlaygroundButton"
        fill
        onClick={() => persistInlineLogView()}
      >
        {'Persist inline Log View'}
      </EuiButton>
      <EuiButton
        data-test-subj="infraStateMachinePlaygroundButton"
        fill
        onClick={() => revertToDefaultLogView()}
      >
        {'Revert to default (persisted) Log View'}
      </EuiButton>
      <EuiButton
        data-test-subj="infraStateMachinePlaygroundButton"
        fill
        onClick={() => updateLogView()}
      >
        {'Update log view'}
      </EuiButton>
    </>
  );
};
