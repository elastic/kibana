/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '../../../utils/test_helper';
import { useFetchSLOSuggestions } from '../hooks/use_fetch_suggestions';
import { SloEditFormDescriptionSection } from './slo_edit_form_description_section';
import type { CreateSLOForm } from '../types';

jest.mock('../hooks/use_fetch_suggestions');

const useFetchSLOSuggestionsMock = useFetchSLOSuggestions as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useFetchSLOSuggestionsMock.mockReturnValue({ suggestions: { tags: [] } });
});

// Renders the section inside a form and returns a getter for the live `tags` value.
const renderSection = (defaultTags: string[] = []) => {
  let latestTags: string[] | undefined;

  function Wrapper() {
    const methods = useForm<CreateSLOForm>({
      defaultValues: { tags: defaultTags } as Partial<CreateSLOForm>,
    });
    latestTags = methods.watch('tags');
    return (
      <FormProvider {...methods}>
        <SloEditFormDescriptionSection />
      </FormProvider>
    );
  }

  render(<Wrapper />);

  return () => latestTags;
};

describe('<SloEditFormDescriptionSection /> tags field', () => {
  it('splits a pasted newline-separated clipboard value into multiple tags', async () => {
    const getTags = renderSection([]);
    const input = await screen.findByTestId('comboBoxSearchInput');

    fireEvent.paste(input, { clipboardData: { getData: () => 'tag1\ntag2\ntag3' } });

    await waitFor(() => {
      expect(getTags()).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  it('splits a pasted comma-separated clipboard value into multiple tags', async () => {
    const getTags = renderSection([]);
    const input = await screen.findByTestId('comboBoxSearchInput');

    fireEvent.paste(input, { clipboardData: { getData: () => 'tag1, tag2 , tag3' } });

    await waitFor(() => {
      expect(getTags()).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  it('de-duplicates case-insensitively and ignores empty values on paste', async () => {
    const getTags = renderSection(['tag1']);
    const input = await screen.findByTestId('comboBoxSearchInput');

    fireEvent.paste(input, { clipboardData: { getData: () => 'TAG1\n\ntag2\ntag2' } });

    await waitFor(() => {
      expect(getTags()).toEqual(['tag1', 'tag2']);
    });
  });

  it('splits a typed comma list created via onCreateOption', async () => {
    const getTags = renderSection([]);
    const input = await screen.findByTestId('comboBoxSearchInput');

    fireEvent.change(input, { target: { value: 'a, b, c' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(getTags()).toEqual(['a', 'b', 'c']);
    });
  });

  it('disables the copy button when there are no tags', async () => {
    renderSection([]);

    expect(await screen.findByTestId('sloEditTagsCopyButton')).toBeDisabled();
  });

  it('enables the copy button when tags exist', async () => {
    renderSection(['tag1', 'tag2']);

    expect(await screen.findByTestId('sloEditTagsCopyButton')).toBeEnabled();
  });
});
