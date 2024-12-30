/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTableRow } from '@elastic/eui';

import { DisabledFieldsBody } from './disabled_fields_body';

describe('DisabledFieldsBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({
      schemaConflicts: {
        foo: {
          text: ['engine1'],
          number: ['engine2'],
        },
        bar: {
          text: ['engine1'],
          number: ['engine2'],
        },
      },
    });
  });

  it('renders a table row for each field', () => {
    const wrapper = shallow(<DisabledFieldsBody />);
    const tableRows = wrapper.find(EuiTableRow);

    expect(tableRows.length).toBe(2);
    expect(tableRows.at(0).find('[data-test-subj="ResultSettingFieldName"]').dive().text()).toEqual(
      'foo'
    );
    expect(tableRows.at(1).find('[data-test-subj="ResultSettingFieldName"]').dive().text()).toEqual(
      'bar'
    );
  });
});
