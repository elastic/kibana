/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuleDetailsStickyHeader } from './rule_details_sticky_header';

describe('RuleDetailsStickyHeader', () => {
  it('pins its content to the top while the page scrolls', () => {
    render(
      <RuleDetailsStickyHeader>
        <div>{'header'}</div>
      </RuleDetailsStickyHeader>
    );

    const container = screen.getByTestId('ruleDetailsStickyHeader');
    expect(container).toHaveStyleRule('position', 'sticky');
    expect(container).toHaveStyleRule('top', '24px');
  });

  it('renders the header before the search bar', () => {
    render(
      <RuleDetailsStickyHeader>
        <div data-test-subj="header">{'header'}</div>
        <div data-test-subj="searchBar">{'search bar'}</div>
      </RuleDetailsStickyHeader>
    );

    expect(
      screen.getByTestId('header').compareDocumentPosition(screen.getByTestId('searchBar'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
