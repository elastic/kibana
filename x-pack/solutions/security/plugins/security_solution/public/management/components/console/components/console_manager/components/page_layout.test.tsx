/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageLayout } from './page_layout';

describe('PageLayout', () => {
  it('renders `pageBody` above the children', () => {
    render(
      <PageLayout
        data-test-subj="test"
        pageBody={<div data-test-subj="test-pageBody">{'banner'}</div>}
      >
        <div data-test-subj="test-console">{'console'}</div>
      </PageLayout>
    );

    expect(screen.getByTestId('test-pageBody')).toBeInTheDocument();
    expect(screen.getByTestId('test-console')).toBeInTheDocument();
  });

  it('does not render a `pageBody` container when none is provided', () => {
    render(
      <PageLayout data-test-subj="test">
        <div data-test-subj="test-console">{'console'}</div>
      </PageLayout>
    );

    expect(screen.queryByTestId('test-pageBody')).not.toBeInTheDocument();
    expect(screen.getByTestId('test-console')).toBeInTheDocument();
  });
});
