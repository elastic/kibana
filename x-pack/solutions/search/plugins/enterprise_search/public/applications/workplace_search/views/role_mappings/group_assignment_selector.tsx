/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiComboBox,
  EuiFormRow,
  EuiHorizontalRule,
  EuiRadioGroup,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { RoleOptionLabel } from '../../../shared/role_mapping';

import {
  GROUP_ASSIGNMENT_INVALID_ERROR,
  GROUP_ASSIGNMENT_LABEL,
  ALL_GROUPS_LABEL,
  ALL_GROUPS_DESCRIPTION,
  SPECIFIC_GROUPS_LABEL,
  SPECIFIC_GROUPS_DESCRIPTION,
} from './constants';

import { RoleMappingsLogic } from './role_mappings_logic';

export const GroupAssignmentSelector: React.FC = () => {
  const { handleAllGroupsSelectionChange, handleGroupSelectionChange } =
    useActions(RoleMappingsLogic);

  const { includeInAllGroups, availableGroups, selectedGroups, selectedOptions } =
    useValues(RoleMappingsLogic);

  const groupAssigmentLabelId = useGeneratedHtmlId();

  const hasGroupAssignment = selectedGroups.size > 0 || includeInAllGroups;

  const groupOptions = [
    {
      id: 'all',
      label: <RoleOptionLabel label={ALL_GROUPS_LABEL} description={ALL_GROUPS_DESCRIPTION} />,
    },
    {
      id: 'specific',
      label: (
        <RoleOptionLabel label={SPECIFIC_GROUPS_LABEL} description={SPECIFIC_GROUPS_DESCRIPTION} />
      ),
    },
  ];

  return (
    <>
      <EuiHorizontalRule />
      <EuiFormRow>
        <EuiRadioGroup
          data-test-subj="enterpriseSearchGroupAssignmentSelectorRadioGroup"
          options={groupOptions}
          idSelected={includeInAllGroups ? 'all' : 'specific'}
          onChange={(id) => handleAllGroupsSelectionChange(id === 'all')}
          legend={{
            children: <span id={groupAssigmentLabelId}>{GROUP_ASSIGNMENT_LABEL}</span>,
          }}
        />
      </EuiFormRow>
      <EuiFormRow isInvalid={!hasGroupAssignment} error={[GROUP_ASSIGNMENT_INVALID_ERROR]}>
        <EuiComboBox
          data-test-subj="groupsSelect"
          selectedOptions={selectedOptions}
          options={availableGroups.map(({ name, id }) => ({ label: name, value: id }))}
          onChange={(options) => {
            handleGroupSelectionChange(options.map(({ value }) => value as string));
          }}
          fullWidth
          isDisabled={includeInAllGroups}
          aria-labelledby={groupAssigmentLabelId}
        />
      </EuiFormRow>
    </>
  );
};
