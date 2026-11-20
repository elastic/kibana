/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import * as i18n from '../translations';

interface LibraryNotSyncedProps {
  isSyncing: boolean;
  canSync: boolean;
  onSync: () => void;
}

export const LibraryNotSynced = ({ isSyncing, canSync, onSync }: LibraryNotSyncedProps) => (
  <EuiEmptyPrompt
    iconType="refresh"
    title={<h2>{i18n.NOT_SYNCED_TITLE}</h2>}
    body={<p>{i18n.NOT_SYNCED_BODY}</p>}
    actions={
      <EuiButton
        fill
        iconType="refresh"
        isLoading={isSyncing}
        isDisabled={!canSync || isSyncing}
        onClick={onSync}
        data-test-subj="syncNeverSyncedLibraryButton"
      >
        {i18n.SYNC_NOW}
      </EuiButton>
    }
    data-test-subj="ruleLibraryNotSynced"
  />
);
