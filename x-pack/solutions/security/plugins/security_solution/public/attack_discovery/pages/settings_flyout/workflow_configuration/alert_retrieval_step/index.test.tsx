/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AlertRetrievalStep } from '.';

describe('AlertRetrievalStep', () => {
  it('renders the alert retrieval step panel', () => {
    render(
      <AlertRetrievalStep>
        <div data-test-subj="content">{'Content'}</div>
      </AlertRetrievalStep>
    );

    expect(screen.getByTestId('alertRetrievalStep')).toBeInTheDocument();
  });

  it('renders the title "Alert retrieval method"', () => {
    render(
      <AlertRetrievalStep>
        <div>{'Content'}</div>
      </AlertRetrievalStep>
    );

    expect(screen.getByText('Alert retrieval method')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(
      <AlertRetrievalStep>
        <div>{'Content'}</div>
      </AlertRetrievalStep>
    );

    expect(
      screen.getByText('Choose how alerts are collected and enriched before generation.')
    ).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <AlertRetrievalStep>
        <div data-test-subj="childContent">{'Child content'}</div>
      </AlertRetrievalStep>
    );

    expect(screen.getByTestId('childContent')).toBeInTheDocument();
  });

  it('renders with hasError=true without crashing', () => {
    render(
      <AlertRetrievalStep hasError>
        <div>{'Content'}</div>
      </AlertRetrievalStep>
    );

    expect(screen.getByTestId('alertRetrievalStep')).toBeInTheDocument();
  });

  it('renders the avatar with step number 1', () => {
    render(
      <AlertRetrievalStep>
        <div>{'Content'}</div>
      </AlertRetrievalStep>
    );

    expect(screen.getByTestId('alertRetrievalStepAvatar')).toBeInTheDocument();
  });
});
