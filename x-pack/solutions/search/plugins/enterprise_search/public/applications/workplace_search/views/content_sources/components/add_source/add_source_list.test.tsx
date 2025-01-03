/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import {
  contentSources,
  configuredSources,
  availableSources,
} from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiFieldSearch } from '@elastic/eui';

import { getPageDescription } from '../../../../../test_helpers';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';

import { AddSourceList } from './add_source_list';
import { AvailableSourcesList } from './available_sources_list';
import { ConfiguredSourcesList } from './configured_sources_list';
import {
  ADD_SOURCE_NEW_SOURCE_DESCRIPTION,
  ADD_SOURCE_ORG_SOURCE_DESCRIPTION,
  ADD_SOURCE_PRIVATE_SOURCE_DESCRIPTION,
} from './constants';

describe('AddSourceList', () => {
  const initializeSources = jest.fn();
  const resetSourcesState = jest.fn();

  const mockValues = {
    contentSources,
    configuredSources,
    availableSources,
    dataLoading: false,
    isOrganization: true,
  };

  beforeEach(() => {
    setMockActions({ initializeSources, resetSourcesState });
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<AddSourceList />);

    expect(wrapper.find(AvailableSourcesList)).toHaveLength(1);
  });

  it('does not render header when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<AddSourceList />);

    expect(wrapper.prop('pageHeader')).toBe(undefined);
  });

  describe('layout', () => {
    it('renders the default workplace search layout when on an organization view', () => {
      setMockValues({ ...mockValues, isOrganization: true });
      const wrapper = shallow(<AddSourceList />);

      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
    });

    it('renders the personal dashboard layout and a header when not in an organization', () => {
      setMockValues({ ...mockValues, isOrganization: false });
      const wrapper = shallow(<AddSourceList />);

      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
      expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    });
  });

  describe('filters sources', () => {
    it('filters available sources', () => {
      const wrapper = shallow(<AddSourceList />);
      const input = wrapper.find('[data-test-subj="FilterSourcesInput"]');
      input.simulate('change', { target: { value: 'jira' } });

      expect(wrapper.find(AvailableSourcesList).prop('sources')).toHaveLength(2);
      expect(wrapper.find(ConfiguredSourcesList).prop('sources')).toHaveLength(0);
    });

    it('filters configured sources', () => {
      const wrapper = shallow(<AddSourceList />);
      const input = wrapper.find('[data-test-subj="FilterSourcesInput"]');
      input.simulate('change', { target: { value: 'confluence' } });

      expect(wrapper.find(ConfiguredSourcesList).prop('sources')).toHaveLength(2);
      expect(wrapper.find(AvailableSourcesList).prop('sources')).toHaveLength(0);
    });

    it('handles case where source has no name', () => {
      setMockValues({
        ...mockValues,
        configuredSources: [{ ...configuredSources[0], name: undefined }],
      });
      const wrapper = shallow(<AddSourceList />);
      const input = wrapper.find('[data-test-subj="FilterSourcesInput"]');
      input.simulate('change', { target: { value: 'not a real connector' } });

      expect(wrapper.find(ConfiguredSourcesList).prop('sources')).toHaveLength(0);
    });
  });

  describe('content headings', () => {
    describe('organization view', () => {
      it('should render the correct organization heading with sources', () => {
        const wrapper = shallow(<AddSourceList />);

        expect(getPageDescription(wrapper)).toEqual(ADD_SOURCE_ORG_SOURCE_DESCRIPTION);
      });

      it('should render the correct organization heading without sources', () => {
        setMockValues({
          ...mockValues,
          contentSources: [],
        });
        const wrapper = shallow(<AddSourceList />);

        expect(getPageDescription(wrapper)).toEqual(
          ADD_SOURCE_NEW_SOURCE_DESCRIPTION + ADD_SOURCE_ORG_SOURCE_DESCRIPTION
        );
      });
    });

    describe('personal dashboard view', () => {
      it('should render the correct personal heading with sources', () => {
        setMockValues({
          ...mockValues,
          isOrganization: false,
        });
        const wrapper = shallow(<AddSourceList />);

        expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
          ADD_SOURCE_PRIVATE_SOURCE_DESCRIPTION
        );
      });

      it('should render the correct personal heading without sources', () => {
        setMockValues({
          ...mockValues,
          isOrganization: false,
          contentSources: [],
        });
        const wrapper = shallow(<AddSourceList />);

        expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(
          ADD_SOURCE_NEW_SOURCE_DESCRIPTION + ADD_SOURCE_PRIVATE_SOURCE_DESCRIPTION
        );
      });
    });
  });

  it('handles empty state for personal dashboard', () => {
    setMockValues({
      ...mockValues,
      isOrganization: false,
      configuredSources: [],
    });

    const wrapper = shallow(<AddSourceList />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(EuiFieldSearch)).toHaveLength(0);
  });
});
