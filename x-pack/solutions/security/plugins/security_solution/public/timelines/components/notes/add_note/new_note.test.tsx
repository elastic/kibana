/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { NewNote } from './new_note';

jest.mock('../../../../common/hooks/use_upselling', () => ({
  useUpsellingMessage: jest.fn(),
}));

describe('NewNote', () => {
  const note = 'The contents of a new note';

  test('renders the note editor', () => {
    render(
      <NewNote
        noteInputHeight={200}
        note={note}
        updateNewNote={jest.fn()}
        setIsMarkdownInvalid={jest.fn()}
      />
    );
    expect(screen.getByTestId('new-note-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('add-a-note')).toBeInTheDocument();
  });

  test('it renders a text area containing the contents of a new (raw) note', () => {
    render(
      <NewNote
        noteInputHeight={200}
        note={note}
        updateNewNote={jest.fn()}
        setIsMarkdownInvalid={jest.fn()}
      />
    );

    expect(screen.getByTestId('add-a-note')).toHaveTextContent(note);
  });
});
