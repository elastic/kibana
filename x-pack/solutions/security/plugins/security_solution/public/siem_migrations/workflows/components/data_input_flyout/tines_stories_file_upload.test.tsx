/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TinesStoriesFileUpload } from './tines_stories_file_upload';
import { TestProviders } from '../../../../common/mock';

const story = (name: string) => ({
  name,
  agents: [{ type: 'Agents::HTTPRequestAgent', name: 'Request', guid: `guid-${name}` }],
});

const toFile = (content: unknown, fileName = 'story.json') =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], fileName, {
    type: 'application/json',
  });

const defaultProps = {
  createMigration: jest.fn(),
  migrationName: 'My migration',
  isLoading: false,
  isCreated: false,
  apiError: undefined,
};

const renderUpload = (props: Partial<React.ComponentProps<typeof TinesStoriesFileUpload>> = {}) =>
  render(<TinesStoriesFileUpload {...defaultProps} {...props} />, { wrapper: TestProviders });

const selectFiles = async (files: File[]) => {
  const input = screen.getByTestId('tinesStoriesFilePicker') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};

describe('TinesStoriesFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should keep the upload button disabled until a valid file is selected', () => {
    renderUpload();

    expect(screen.getByTestId('uploadTinesStoriesButton')).toBeDisabled();
  });

  it('should create the migration with the story of a valid single story file', async () => {
    renderUpload();

    await selectFiles([toFile(story('Story A'))]);
    await waitFor(() => expect(screen.getByTestId('uploadTinesStoriesButton')).toBeEnabled());
    fireEvent.click(screen.getByTestId('uploadTinesStoriesButton'));

    expect(defaultProps.createMigration).toHaveBeenCalledWith('My migration', [
      expect.objectContaining({ name: 'Story A' }),
    ]);
  });

  it('should create the migration with every story of a file that contains an array of stories', async () => {
    renderUpload();

    await selectFiles([toFile([story('Story A'), story('Story B')])]);
    await waitFor(() => expect(screen.getByTestId('uploadTinesStoriesButton')).toBeEnabled());
    fireEvent.click(screen.getByTestId('uploadTinesStoriesButton'));

    expect(defaultProps.createMigration).toHaveBeenCalledWith('My migration', [
      expect.objectContaining({ name: 'Story A' }),
      expect.objectContaining({ name: 'Story B' }),
    ]);
  });

  it('should combine the stories of several files', async () => {
    renderUpload();

    await selectFiles([toFile(story('Story A'), 'a.json'), toFile(story('Story B'), 'b.json')]);
    await waitFor(() => expect(screen.getByTestId('uploadTinesStoriesButton')).toBeEnabled());
    fireEvent.click(screen.getByTestId('uploadTinesStoriesButton'));

    expect(defaultProps.createMigration).toHaveBeenCalledWith('My migration', [
      expect.objectContaining({ name: 'Story A' }),
      expect.objectContaining({ name: 'Story B' }),
    ]);
  });

  it('should show an error and keep the button disabled when the file is not valid JSON', async () => {
    renderUpload();

    await selectFiles([toFile('{ not json')]);

    expect(await screen.findByText('The file does not contain valid JSON')).toBeInTheDocument();
    expect(screen.getByTestId('uploadTinesStoriesButton')).toBeDisabled();
  });

  it('should show an error and keep the button disabled when the file is not a Tines story', async () => {
    renderUpload();

    await selectFiles([toFile({ name: 'No agents here' })]);

    expect(
      await screen.findByText(/The file does not contain a valid Tines story export/)
    ).toBeInTheDocument();
    expect(screen.getByTestId('uploadTinesStoriesButton')).toBeDisabled();
  });

  it('should keep the upload button disabled without a migration name', async () => {
    renderUpload({ migrationName: undefined });

    await selectFiles([toFile(story('Story A'))]);

    await waitFor(() => expect(screen.queryByText(/valid/)).not.toBeInTheDocument());
    expect(screen.getByTestId('uploadTinesStoriesButton')).toBeDisabled();
  });

  it('should show the error returned by the API', () => {
    renderUpload({ apiError: 'Could not create the migration' });

    expect(screen.getByText('Could not create the migration')).toBeInTheDocument();
  });
});
