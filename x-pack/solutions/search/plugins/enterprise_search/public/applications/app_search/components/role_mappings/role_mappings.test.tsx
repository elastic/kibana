/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  RoleMappingsTable,
  RoleMappingsHeading,
  UsersHeading,
  UsersEmptyPrompt,
} from '../../../shared/role_mapping';
import {
  asRoleMapping,
  asSingleUserRoleMapping,
} from '../../../shared/role_mapping/__mocks__/roles';

import { RoleMapping } from './role_mapping';
import { RoleMappings } from './role_mappings';
import { User } from './user';

describe('RoleMappings', () => {
  const initializeRoleMappings = jest.fn();
  const initializeRoleMapping = jest.fn();
  const initializeSingleUserRoleMapping = jest.fn();
  const handleDeleteMapping = jest.fn();
  const mockValues = {
    roleMappings: [asRoleMapping],
    dataLoading: false,
    singleUserRoleMappings: [asSingleUserRoleMapping],
    singleUserRoleMappingFlyoutOpen: false,
  };

  beforeEach(() => {
    setMockActions({
      initializeRoleMappings,
      initializeRoleMapping,
      initializeSingleUserRoleMapping,
      handleDeleteMapping,
    });
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<RoleMappings />);

    expect(wrapper.find(RoleMappingsTable)).toHaveLength(1);
  });

  it('renders RoleMapping flyout', () => {
    setMockValues({ ...mockValues, roleMappingFlyoutOpen: true });
    const wrapper = shallow(<RoleMappings />);

    expect(wrapper.find(RoleMapping)).toHaveLength(1);
  });

  it('renders User flyout', () => {
    setMockValues({ ...mockValues, singleUserRoleMappingFlyoutOpen: true });
    const wrapper = shallow(<RoleMappings />);

    expect(wrapper.find(User)).toHaveLength(1);
  });

  it('handles RoleMappingsHeading onClick', () => {
    const wrapper = shallow(<RoleMappings />);
    wrapper.find(RoleMappingsHeading).prop('onClick')();

    expect(initializeRoleMapping).toHaveBeenCalled();
  });

  it('handles UsersHeading onClick', () => {
    const wrapper = shallow(<RoleMappings />);
    wrapper.find(UsersHeading).prop('onClick')();

    expect(initializeSingleUserRoleMapping).toHaveBeenCalled();
  });

  it('handles empty users state', () => {
    setMockValues({ ...mockValues, singleUserRoleMappings: [] });
    const wrapper = shallow(<RoleMappings />);

    expect(wrapper.find(UsersEmptyPrompt)).toHaveLength(1);
  });
});
