/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { listLabels } from './translations';

export const AutomationsEmptyPrompt = ({ onCreate }: { onCreate?: () => void }) => (
  <EuiEmptyPrompt
    titleSize="xs"
    paddingSize="m"
    title={<h3>{listLabels.emptyTitle}</h3>}
    body={<p>{listLabels.emptyBody}</p>}
    actions={
      onCreate ? (
        <EuiButton
          data-test-subj="automationsCreateCustom"
          size="s"
          onClick={onCreate}
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.CREATE_AUTOMATION,
            element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
          })}
        >
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
      <EuiButton
        data-test-subj="nightshiftAutomationsPageButton"
        onClick={onClearFilters}
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.CLEAR_AUTOMATION_FILTERS,
          element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
        })}
      >
        {listLabels.clearSearchAndFilters}
      </EuiButton>
    }
  />
);
