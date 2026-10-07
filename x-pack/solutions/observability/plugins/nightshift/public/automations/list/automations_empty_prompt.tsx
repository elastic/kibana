/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { listLabels } from './translations';

export const AutomationsEmptyPrompt = ({ onCreate }: { onCreate?: () => void }) => (
  <EuiEmptyPrompt
    titleSize="xs"
    paddingSize="m"
    title={<h3>{listLabels.emptyTitle}</h3>}
    body={<p>{listLabels.emptyBody}</p>}
    actions={
      onCreate ? (
        <EuiButton data-test-subj="automationsCreateCustom" size="s" onClick={onCreate}>
          {listLabels.createCustom}
        </EuiButton>
      ) : undefined
    }
    data-test-subj="automationsEmptyState"
  />
);

export const FilteredEmptyPrompt = ({ onClearFilters }: { onClearFilters: () => void }) => (
  <EuiEmptyPrompt
    title={<h2>{listLabels.filteredEmptyTitle}</h2>}
    body={<p>{listLabels.filteredEmptyBody}</p>}
    actions={
      <EuiButton data-test-subj="nightshiftAutomationsPageButton" onClick={onClearFilters}>
        {listLabels.clearSearchAndFilters}
      </EuiButton>
    }
  />
);
