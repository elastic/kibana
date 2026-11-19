/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import * as i18n from '../translations';

interface LibraryNotRefreshedProps {
  isRefreshing: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
}

export const LibraryNotRefreshed = ({
  isRefreshing,
  canRefresh,
  onRefresh,
}: LibraryNotRefreshedProps) => (
  <EuiEmptyPrompt
    iconType="refresh"
    title={<h2>{i18n.NOT_REFRESHED_TITLE}</h2>}
    body={<p>{i18n.NOT_REFRESHED_BODY}</p>}
    actions={
      <EuiButton
        fill
        iconType="refresh"
        isLoading={isRefreshing}
        isDisabled={!canRefresh}
        onClick={onRefresh}
        data-test-subj="refreshNeverRefreshedLibraryButton"
      >
        {i18n.REFRESH_NOW}
      </EuiButton>
    }
    data-test-subj="ruleLibraryNotRefreshed"
  />
);
