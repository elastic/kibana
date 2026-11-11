/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSelect } from './filter_select';

const TEST_SUBJ = 'testFilter';

const toOptions = (names: string[]) => names.map((name) => ({ name, label: name }));

const renderFilterSelect = (props: Partial<React.ComponentProps<typeof FilterSelect>> = {}) => {
  const onChange = jest.fn();
  render(
    <FilterSelect
      label="Cloud provider"
      options={toOptions(['aws', 'azure', 'gcp'])}
      selected={[]}
      onChange={onChange}
      ebt={{ element: 'testElement' }}
      data-test-subj={TEST_SUBJ}
      {...props}
    />
  );
  return { onChange };
};

const openList = () => userEvent.click(screen.getByTestId(TEST_SUBJ));

describe('FilterSelect', () => {
  describe('single selection with an all option', () => {
    const singleSelectProps = { label: 'Type', allLabel: 'All types', singleSelection: true };

    it('shows the all label when nothing is selected', () => {
      renderFilterSelect(singleSelectProps);

      expect(screen.getByTestId(TEST_SUBJ)).toHaveTextContent('All types');
    });

    it('shows the selected option instead of the all label', () => {
      renderFilterSelect({
        ...singleSelectProps,
        selected: ['aws'],
        options: [{ name: 'aws', label: 'AWS' }],
      });

      expect(screen.getByTestId(TEST_SUBJ)).toHaveTextContent('AWS');
    });

    it('selects an option', async () => {
      const { onChange } = renderFilterSelect(singleSelectProps);

      await openList();
      await userEvent.click(screen.getByRole('option', { name: 'azure' }));

      expect(onChange).toHaveBeenCalledWith(['azure']);
    });

    it('does not report a selection that did not change', async () => {
      const { onChange } = renderFilterSelect({ ...singleSelectProps, selected: ['aws'] });

      await openList();
      await userEvent.click(screen.getByRole('option', { name: 'aws' }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the selection when the all option is selected', async () => {
      const { onChange } = renderFilterSelect({ ...singleSelectProps, selected: ['aws'] });

      await openList();
      await userEvent.click(screen.getByRole('option', { name: 'All types' }));

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('does not show the number of options', () => {
      renderFilterSelect(singleSelectProps);

      expect(screen.getByTestId(TEST_SUBJ)).not.toHaveTextContent('3');
    });
  });

  describe('multiple selection', () => {
    it('shows the label and the number of options', () => {
      renderFilterSelect();

      expect(screen.getByTestId(TEST_SUBJ)).toHaveTextContent('Cloud provider');
      expect(screen.getByTestId(TEST_SUBJ)).toHaveTextContent('3');
    });

    it('does not show the number of options while loading', () => {
      renderFilterSelect({ isLoading: true });

      expect(screen.getByTestId(TEST_SUBJ)).not.toHaveTextContent('3');
    });

    it('removes an option from the selection', async () => {
      const { onChange } = renderFilterSelect({ selected: ['aws', 'azure'] });

      await openList();
      await userEvent.click(screen.getByRole('option', { name: 'aws' }));

      expect(onChange).toHaveBeenCalledWith(['azure']);
    });

    it('clears the selection with the all option', async () => {
      const { onChange } = renderFilterSelect({ allLabel: 'All providers', selected: ['aws'] });

      await openList();
      await userEvent.click(screen.getByRole('option', { name: 'All providers' }));

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('adds an option to the selection', async () => {
      const { onChange } = renderFilterSelect({ selected: ['aws'] });

      await openList();
      await userEvent.click(screen.getByRole('option', { name: 'gcp' }));

      expect(onChange).toHaveBeenCalledWith(['aws', 'gcp']);
    });
  });

  describe('error', () => {
    it('shows the error message in the list', async () => {
      renderFilterSelect({ errorMessage: 'The values could not be loaded' });

      await openList();

      expect(screen.getByText('The values could not be loaded')).toBeInTheDocument();
    });

    it('keeps the selected options so they can be removed', async () => {
      const { onChange } = renderFilterSelect({
        options: [],
        selected: ['aws'],
        errorMessage: 'The values could not be loaded',
      });

      await openList();

      expect(screen.getByText('The values could not be loaded')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('option', { name: 'aws' }));

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('selection', () => {
    it('keeps a selected value that is not in the list', async () => {
      const { onChange } = renderFilterSelect({ selected: ['other'] });

      await openList();
      await userEvent.click(screen.getByRole('option', { name: 'gcp' }));

      expect(onChange).toHaveBeenCalledWith(['other', 'gcp']);
    });
  });

  describe('invalid options', () => {
    it('does not list an invalid option that is no longer selected', async () => {
      renderFilterSelect({
        options: toOptions(['aws']),
        invalidOptions: ['azure'],
        selected: [],
      });

      await openList();

      expect(screen.queryByRole('option', { name: 'azure' })).not.toBeInTheDocument();
    });

    it('lists them before the other options and lets the user remove them', async () => {
      const { onChange } = renderFilterSelect({
        options: toOptions(['aws']),
        invalidOptions: ['azure'],
        selected: ['azure'],
      });

      await openList();
      const options = screen.getAllByRole('option');

      expect(options[0]).toHaveTextContent('azure');
      expect(options[1]).toHaveTextContent('aws');

      await userEvent.click(options[0]);

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });
});
