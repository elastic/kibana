/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../../__mocks__/react_router';
import '../../../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { SchemaErrorsAccordion } from '../../../../../shared/schema';

import { SchemaChangeErrors } from './schema_change_errors';

describe('SchemaChangeErrors', () => {
  const fieldCoercionErrors = [] as any;
  const serverSchema = {
    foo: 'string',
  };
  it('renders', () => {
    setMockValues({ fieldCoercionErrors, serverSchema });
    setMockActions({ initializeSchemaFieldErrors: jest.fn() });

    mockUseParams.mockImplementationOnce(() => ({
      activeReindexJobId: '1',
      sourceId: '123',
    }));
    const wrapper = shallow(<SchemaChangeErrors />);

    expect(wrapper.find(SchemaErrorsAccordion)).toHaveLength(1);
  });
});
