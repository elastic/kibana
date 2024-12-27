/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';
import { exampleResult } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { LEAVE_UNASSIGNED_FIELD } from './constants';
import { ExampleSearchResultGroup } from './example_search_result_group';
import { ExampleStandoutResult } from './example_standout_result';
import { SearchResults } from './search_results';

describe('SearchResults', () => {
  const { searchResultConfig } = exampleResult;
  const fieldOptions = [
    {
      value: 'foo',
      text: 'Foo',
    },
  ];
  const optionalFieldOptions = [
    {
      value: 'bar',
      text: 'Bar',
    },
  ];
  const toggleTitleFieldHover = jest.fn();
  const toggleSubtitleFieldHover = jest.fn();
  const toggleDescriptionFieldHover = jest.fn();
  const setTitleField = jest.fn();
  const setSubtitleField = jest.fn();
  const setDescriptionField = jest.fn();
  const setUrlField = jest.fn();
  const setColorField = jest.fn();
  const setTypeField = jest.fn();
  const setMediaTypeField = jest.fn();
  const setCreatedByField = jest.fn();
  const setUpdatedByField = jest.fn();

  beforeEach(() => {
    setMockActions({
      toggleTitleFieldHover,
      toggleSubtitleFieldHover,
      toggleDescriptionFieldHover,
      setTitleField,
      setSubtitleField,
      setDescriptionField,
      setUrlField,
      setColorField,
      setTypeField,
      setMediaTypeField,
      setCreatedByField,
      setUpdatedByField,
    });
    setMockValues({
      searchResultConfig,
      fieldOptions,
      optionalFieldOptions,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<SearchResults />);

    expect(wrapper.find(ExampleSearchResultGroup)).toHaveLength(1);
    expect(wrapper.find(ExampleStandoutResult)).toHaveLength(1);
  });

  it('calls setTitleField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="TitleFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.titleField } });

    expect(setTitleField).toHaveBeenCalled();
  });

  it('calls setUrlField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="UrlFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.urlField } });

    expect(setUrlField).toHaveBeenCalled();
  });

  it('calls setSubtitleField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="SubtitleFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.titleField } });

    expect(setSubtitleField).toHaveBeenCalledWith(searchResultConfig.titleField);
  });

  it('calls setDescriptionField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="DescriptionFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.descriptionField } });

    expect(setDescriptionField).toHaveBeenCalledWith(searchResultConfig.descriptionField);
  });

  it('calls setTypeField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="TypeFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.typeField } });

    expect(setTypeField).toHaveBeenCalledWith(searchResultConfig.typeField);
  });

  it('calls setMediaTypeField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="MediaTypeFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.mediaTypeField } });

    expect(setMediaTypeField).toHaveBeenCalledWith(searchResultConfig.mediaTypeField);
  });

  it('calls setCreatedByField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="CreatedByFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.createdByField } });

    expect(setCreatedByField).toHaveBeenCalledWith(searchResultConfig.createdByField);
  });

  it('calls setUpdatedByField on change', () => {
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="UpdatedByFieldSelect"]')
      .simulate('change', { target: { value: searchResultConfig.updatedByField } });

    expect(setUpdatedByField).toHaveBeenCalledWith(searchResultConfig.updatedByField);
  });

  it('handles blank fallbacks', () => {
    setMockValues({
      searchResultConfig: { detailFields: [] },
      fieldOptions,
      optionalFieldOptions,
    });
    const wrapper = shallow(<SearchResults />);
    wrapper
      .find('[data-test-subj="SubtitleFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });
    wrapper
      .find('[data-test-subj="DescriptionFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });
    wrapper
      .find('[data-test-subj="TypeFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });
    wrapper
      .find('[data-test-subj="MediaTypeFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });
    wrapper
      .find('[data-test-subj="CreatedByFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });
    wrapper
      .find('[data-test-subj="UpdatedByFieldSelect"]')
      .simulate('change', { target: { value: LEAVE_UNASSIGNED_FIELD } });

    expect(wrapper.find('[data-test-subj="UrlFieldSelect"]').prop('value')).toEqual('');
    expect(setSubtitleField).toHaveBeenCalledWith(null);
    expect(setDescriptionField).toHaveBeenCalledWith(null);
    expect(setTypeField).toHaveBeenCalledWith(null);
    expect(setMediaTypeField).toHaveBeenCalledWith(null);
    expect(setCreatedByField).toHaveBeenCalledWith(null);
    expect(setUpdatedByField).toHaveBeenCalledWith(null);
  });
});
