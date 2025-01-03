/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { waitFor } from '@testing-library/react';
import { shallow } from 'enzyme';

import { EuiComboBox, EuiComboBoxOptionOption, EuiRadioGroup } from '@elastic/eui';

import { wsRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

import { GroupAssignmentSelector } from './group_assignment_selector';

describe('GroupAssignmentSelector', () => {
  const initializeRoleMappings = jest.fn();
  const initializeRoleMapping = jest.fn();
  const handleSaveMapping = jest.fn();
  const handleGroupSelectionChange = jest.fn();
  const handleAllGroupsSelectionChange = jest.fn();
  const handleAttributeValueChange = jest.fn();
  const handleAttributeSelectorChange = jest.fn();
  const handleDeleteMapping = jest.fn();
  const handleRoleChange = jest.fn();
  const resetState = jest.fn();
  const groups = [
    {
      name: 'Group 1',
      id: 'g1',
    },
    {
      name: 'Group 2',
      id: 'g2',
    },
  ];
  const mockValues = {
    attributes: [],
    elasticsearchRoles: [],
    dataLoading: false,
    roleType: 'admin',
    roleMappings: [wsRoleMapping],
    attributeValue: '',
    attributeName: 'username',
    availableGroups: groups,
    selectedGroups: new Set(),
    includeInAllGroups: false,
    roleMappingErrors: [],
  };

  beforeEach(() => {
    setMockActions({
      initializeRoleMappings,
      initializeRoleMapping,
      handleSaveMapping,
      handleGroupSelectionChange,
      handleAllGroupsSelectionChange,
      handleAttributeValueChange,
      handleAttributeSelectorChange,
      handleDeleteMapping,
      handleRoleChange,
      resetState,
    });
    setMockValues(mockValues);
  });

  it('renders', () => {
    setMockValues({ ...mockValues, GroupAssignmentSelector: wsRoleMapping });
    const wrapper = shallow(<GroupAssignmentSelector />);

    expect(wrapper.find(EuiRadioGroup)).toHaveLength(1);
    expect(wrapper.find(EuiComboBox)).toHaveLength(1);
  });

  it('sets initial selected state when includeInAllGroups is true', () => {
    setMockValues({ ...mockValues, includeInAllGroups: true });
    const wrapper = shallow(<GroupAssignmentSelector />);

    expect(wrapper.find(EuiRadioGroup).prop('idSelected')).toBe('all');
  });

  it('handles all/specific groups radio change', () => {
    const wrapper = shallow(<GroupAssignmentSelector />);
    const radio = wrapper.find(EuiRadioGroup);
    radio.simulate('change', { target: { checked: false } });

    expect(handleAllGroupsSelectionChange).toHaveBeenCalledWith(false);
  });

  it('handles group checkbox click', async () => {
    const wrapper = shallow(<GroupAssignmentSelector />);
    await waitFor(() =>
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange([{ label: groups[0].name, value: groups[0].name }])
    );
    wrapper.update();

    expect(handleGroupSelectionChange).toHaveBeenCalledWith([groups[0].name]);
  });
});
