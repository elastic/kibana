/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
        lastUpdate={<p>Last update value</p>}
        lastUpdateValue="value"
      />
    );
    expect(wrapper.container).toMatchSnapshot();
    expect(wrapper.getByTestId('MetaInfoDetailslastUpdate')).toHaveTextContent('Last update value');
  });
});
