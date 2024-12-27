/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../__mocks__/react_router';
import '../../../../__mocks__/shallow_useeffect.mock';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { SchemaErrorsAccordion } from '../../../../shared/schema';

import { ReindexJob } from '.';

describe('ReindexJob', () => {
  const values = {
    dataLoading: false,
    fieldCoercionErrors: {},
    engine: {
      schema: {
        some_field: 'text',
      },
    },
  };
  const actions = {
    loadReindexJob: jest.fn(),
  };

  beforeEach(() => {
    mockUseParams.mockReturnValueOnce({ reindexJobId: 'abc1234567890' });
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<ReindexJob />);

    expect(wrapper.find(SchemaErrorsAccordion)).toHaveLength(1);
    expect(wrapper.find(SchemaErrorsAccordion).prop('generateViewPath')).toHaveLength(1);
  });

  it('calls loadReindexJob on page load', () => {
    shallow(<ReindexJob />);

    expect(actions.loadReindexJob).toHaveBeenCalledWith('abc1234567890');
  });

  it('renders schema errors with links to document pages', () => {
    const wrapper = shallow(<ReindexJob />);
    const generateViewPath = wrapper
      .find(SchemaErrorsAccordion)
      .prop('generateViewPath') as Function;

    expect(generateViewPath('some-document-id')).toEqual(
      '/engines/some-engine/documents/some-document-id'
    );
  });
});
