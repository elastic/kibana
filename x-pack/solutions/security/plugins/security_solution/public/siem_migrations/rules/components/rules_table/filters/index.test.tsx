/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MigrationRulesFilter } from '.';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { StatusFilterBase } from '../../../../common/types';
import { RulesSpecificStatusFilter } from '../../../types';

describe('MigrationRulesFilter', () => {
  it('renders the filters component', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRulesFilter onFilterOptionsChanged={() => {}} />
      </TestProviders>
    );

    expect(getByTestId('statusFilterButton')).toBeInTheDocument();
    expect(getByTestId('authorFilterButton')).toBeInTheDocument();
  });

  it('calls filter changed handler on `installed` status selection', async () => {
    const onFilterOptionsChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <MigrationRulesFilter onFilterOptionsChanged={onFilterOptionsChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('statusFilterButton'));
    fireEvent.click(getByText('Installed'));

    await waitFor(() => {
      expect(onFilterOptionsChanged).toHaveBeenCalledWith({ status: StatusFilterBase.INSTALLED });
    });
  });

  it('calls filter changed handler on `translated` status selection', async () => {
    const onFilterOptionsChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <MigrationRulesFilter onFilterOptionsChanged={onFilterOptionsChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('statusFilterButton'));
    fireEvent.click(getByText('Translated'));

    await waitFor(() => {
      expect(onFilterOptionsChanged).toHaveBeenCalledWith({ status: StatusFilterBase.TRANSLATED });
    });
  });

  it('calls filter changed handler on `partially translated` status selection', async () => {
    const onFilterOptionsChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <MigrationRulesFilter onFilterOptionsChanged={onFilterOptionsChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('statusFilterButton'));
    fireEvent.click(getByText('Partially translated'));

    await waitFor(() => {
      expect(onFilterOptionsChanged).toHaveBeenCalledWith({
        status: StatusFilterBase.PARTIALLY_TRANSLATED,
      });
    });
  });

  it('calls filter changed handler on `not translated` status selection', async () => {
    const onFilterOptionsChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <MigrationRulesFilter onFilterOptionsChanged={onFilterOptionsChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('statusFilterButton'));
    fireEvent.click(getByText('Not translated'));

    await waitFor(() => {
      expect(onFilterOptionsChanged).toHaveBeenCalledWith({
        status: StatusFilterBase.UNTRANSLATABLE,
      });
    });
  });

  it('calls filter changed handler on `failed` status selection', async () => {
    const onFilterOptionsChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <MigrationRulesFilter onFilterOptionsChanged={onFilterOptionsChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('statusFilterButton'));
    fireEvent.click(getByText('Failed'));

    await waitFor(() => {
      expect(onFilterOptionsChanged).toHaveBeenCalledWith({ status: StatusFilterBase.FAILED });
    });
  });

  it('calls filter changed handler on `index pattern missing` status selection', async () => {
    const onFilterOptionsChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <MigrationRulesFilter onFilterOptionsChanged={onFilterOptionsChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('statusFilterButton'));
    fireEvent.click(getByText('Index pattern missing'));

    await waitFor(() => {
      expect(onFilterOptionsChanged).toHaveBeenCalledWith({
        status: RulesSpecificStatusFilter.INDEX_PATTERN_MISSING,
      });
    });
  });
});
