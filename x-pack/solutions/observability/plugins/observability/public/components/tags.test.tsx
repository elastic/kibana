/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../utils/test_helper';
import { Tags } from './tags';

describe('Tags', () => {
  it('renders visible badges and +N more when oneLine is true', () => {
    const { getByText } = render(
      <Tags
        tags={['prod', 'apm', 'critical', 'frontend', 'slo', 'nightly']}
        color="hollow"
        size={5}
        oneLine
      />
    );

    expect(getByText('prod')).toBeInTheDocument();
    expect(getByText('+1 more')).toBeInTheDocument();
  });

  it('does not render the more-tags popover when every tag is visible', () => {
    const { getByText, queryByText } = render(
      <Tags tags={['prod', 'apm']} color="hollow" size={5} oneLine />
    );

    expect(getByText('prod')).toBeInTheDocument();
    expect(getByText('apm')).toBeInTheDocument();
    expect(queryByText('+1 more')).not.toBeInTheDocument();
  });
});
