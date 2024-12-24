/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MetaInfoDetails } from '.';

describe('MetaInfoDetails', () => {
  it('should render lastUpdate as string', () => {
    const wrapper = render(
      <MetaInfoDetails
        dataTestSubj="MetaInfoDetails"
        label="created_by"
        lastUpdate="last update"
        lastUpdateValue="value"
      />
    );
    expect(wrapper.container).toMatchSnapshot();
    expect(wrapper.getByTestId('MetaInfoDetailslastUpdate')).toHaveTextContent('last update');
  });
  it('should render lastUpdate as JSX Element', () => {
    const wrapper = render(
      <MetaInfoDetails
        dataTestSubj="MetaInfoDetails"
        label="created_by"
        // eslint-disable-next-line react/jsx-no-literals
        lastUpdate={<p>Last update value</p>}
        lastUpdateValue="value"
      />
    );
    expect(wrapper.container).toMatchSnapshot();
    expect(wrapper.getByTestId('MetaInfoDetailslastUpdate')).toHaveTextContent('Last update value');
  });
});
