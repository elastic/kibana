/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutFooter } from './flyout_footer';

const text = 'some text';
const dataTestSubj = 'flyout footer';

describe('<FlyoutFooter />', () => {
  it('should render footer', () => {
    const { getByTestId } = render(
      <FlyoutFooter data-test-subj={dataTestSubj}>{text}</FlyoutFooter>
    );
    expect(getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(getByTestId(dataTestSubj)).toHaveTextContent(text);
  });
});
