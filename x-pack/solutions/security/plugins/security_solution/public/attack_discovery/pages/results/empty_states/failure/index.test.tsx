/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Failure } from '.';
import { LEARN_MORE, FAILURE_TITLE } from './translations';
const failureReason = "You're a failure";
describe('Failure', () => {
  beforeEach(() => {
    render(<Failure failureReason={failureReason} />);
  });

  it('renders the expected title', () => {
    const title = screen.getByTestId('failureTitle');

    expect(title).toHaveTextContent(FAILURE_TITLE);
  });

  it('renders the expected body text', () => {
    const bodyText = screen.getByTestId('bodyText');

    expect(bodyText).toHaveTextContent(failureReason);
  });

  describe('link', () => {
    let learnMoreLink: HTMLElement;

    beforeEach(() => {
      learnMoreLink = screen.getByTestId('learnMoreLink');
    });

    it('links to the documentation', () => {
      expect(learnMoreLink).toHaveAttribute(
        'href',
        'https://www.elastic.co/guide/en/security/current/attack-discovery.html'
      );
    });

    it('opens in a new tab', () => {
      expect(learnMoreLink).toHaveAttribute('target', '_blank');
    });

    it('has the expected text', () => {
      expect(learnMoreLink).toHaveTextContent(LEARN_MORE);
    });
  });

  describe('error text formatting', () => {
    it('allows errors containing long strings of text, e.g. alert IDs, to wrap when necessary', () => {
      const bodyText = screen.getByTestId('bodyText');

      expect(bodyText).toHaveStyle('word-wrap: break-word');
    });
  });
});
