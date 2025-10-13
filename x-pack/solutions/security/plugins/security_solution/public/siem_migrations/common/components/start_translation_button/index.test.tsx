/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { StartTranslationButton } from '.';

describe('StartTranslationButton', () => {
  const startMigration = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders button component', () => {
    const { getByTestId } = render(
      <StartTranslationButton
        migrationId="1"
        isStopped={false}
        startMigration={startMigration}
        isStarting={false}
      />
    );
    expect(getByTestId('startMigrationButton')).toBeInTheDocument();
  });

  it('renders the start button', () => {
    const { getByTestId } = render(
      <StartTranslationButton
        migrationId="1"
        isStopped={false}
        startMigration={startMigration}
        isStarting={false}
      />
    );
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Start');
  });

  it('renders the resume button', () => {
    const { getByTestId } = render(
      <StartTranslationButton
        migrationId="1"
        isStopped={true}
        startMigration={startMigration}
        isStarting={false}
      />
    );
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Resume');
  });

  it('renders the starting button', () => {
    const { getByTestId } = render(
      <StartTranslationButton
        migrationId="1"
        isStopped={false}
        startMigration={startMigration}
        isStarting={true}
      />
    );
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Starting');
  });

  it('renders the resuming button', () => {
    const { getByTestId } = render(
      <StartTranslationButton
        migrationId="1"
        isStopped={true}
        startMigration={startMigration}
        isStarting={true}
      />
    );
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Resuming');
  });

  it('calls startMigration when the button is clicked', () => {
    const { getByTestId } = render(
      <StartTranslationButton
        migrationId="1"
        isStopped={false}
        startMigration={startMigration}
        isStarting={false}
      />
    );
    fireEvent.click(getByTestId('startMigrationButton'));
    expect(startMigration).toHaveBeenCalledWith('1');
  });
});
