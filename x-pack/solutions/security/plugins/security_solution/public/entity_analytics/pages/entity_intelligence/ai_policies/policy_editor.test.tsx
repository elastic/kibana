/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PolicyEditor } from './policy_editor';
import { emptyPolicy } from './policy_form';

const onSave = jest.fn();
const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  onSave.mockResolvedValue(true);
});

it('prevents a broad accidental policy with no conditions from being saved', () => {
  render(<PolicyEditor saving={false} onSave={onSave} onClose={onClose} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Policy name' }), {
    target: { value: 'Observe tool activity' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create policy' }));
  expect(
    screen.getByText('Add a tool name or text to match in the tool input.')
  ).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

it('normalizes the actual form submission and closes only after successful persistence', async () => {
  render(
    <PolicyEditor
      saving={false}
      initial={{ ...emptyPolicy(), name: ' Protected file ' }}
      onSave={onSave}
      onClose={onClose}
    />
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Tool name is one of' }), {
    target: { value: 'read_file, exec_command, read_file' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Tool input contains' }), {
    target: { value: ' private.csv ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create policy' }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Protected file',
      toolNames: ['read_file', 'exec_command'],
      inputContains: 'private.csv',
      mode: 'monitor',
    }),
    undefined
  );
});

it('keeps unsaved form inputs after a failed save', async () => {
  onSave.mockResolvedValue(false);
  render(
    <PolicyEditor
      saving={false}
      initial={{ ...emptyPolicy(), name: 'Protected file', inputContains: 'private.csv' }}
      onSave={onSave}
      onClose={onClose}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create policy' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox', { name: 'Tool input contains' })).toHaveValue('private.csv');
});

it('previews an example without saving or executing it', () => {
  render(
    <PolicyEditor
      saving={false}
      initial={{ ...emptyPolicy(), name: 'Protected file', inputContains: 'private.csv' }}
      onSave={onSave}
      onClose={onClose}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Try the matching conditions' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Example recorded input' }), {
    target: { value: '{"path":"PRIVATE.CSV"}' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check match' }));
  expect(screen.getByText('These conditions match the example call.')).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});
