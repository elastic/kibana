/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';

import { getDisplayName } from '../get_display_name';
import * as i18n from '../../../translations';

export interface WorkflowOptionValue {
  description: string;
  enabled?: boolean;
  id: string;
  isDefault?: boolean;
}

export type WorkflowOption = EuiComboBoxOptionOption<WorkflowOptionValue>;

export const getWorkflowOptionValue = (workflow: {
  description: string;
  enabled?: boolean;
  id: string;
  isDefault?: boolean;
}): WorkflowOptionValue => ({
  description: workflow.description,
  enabled: workflow.enabled,
  id: workflow.id,
  isDefault: workflow.isDefault,
});

export const renderWorkflowOption = (
  option: WorkflowOption,
  searchValue: string,
  contentClassName: string
): React.ReactNode => {
  const description = option.value?.description;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
      <EuiFlexItem grow style={{ minWidth: 0 }}>
        <div className={contentClassName} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </div>
        {description ? (
          <EuiText
            data-test-subj="workflowOptionDescription"
            size="xs"
            color="subdued"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {description}
          </EuiText>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const renderSuperSelectInputDisplay = (workflow: {
  enabled?: boolean;
  isDefault?: boolean;
  name: string;
}): React.ReactNode => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap={false}>
      <EuiFlexItem grow={false} className="eui-textTruncate">
        {getDisplayName(workflow)}
      </EuiFlexItem>
      {workflow.isDefault === true && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="defaultBadge">
            {i18n.DEFAULT_BADGE}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const renderSuperSelectDropdownDisplay = (workflow: {
  description: string;
  enabled?: boolean;
  isDefault?: boolean;
  name: string;
}): React.ReactNode => {
  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        wrap={false}
      >
        <EuiFlexItem grow={false} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {getDisplayName(workflow)}
        </EuiFlexItem>
        {workflow.isDefault === true && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="defaultBadgeDropdown">
              {i18n.DEFAULT_BADGE}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {workflow.description ? (
        <EuiText
          data-test-subj="workflowOptionDescription"
          size="xs"
          color="subdued"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {workflow.description}
        </EuiText>
      ) : null}
    </>
  );
};
