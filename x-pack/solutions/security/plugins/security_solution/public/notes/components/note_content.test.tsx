/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { NoteContent } from './note_content';
import { NOTE_CONTENT_BUTTON_TEST_ID, NOTE_CONTENT_POPOVER_TEST_ID } from './test_ids';

const note = 'note-text';

describe('NoteContent', () => {
  it('should render a note and the popover', () => {
    const { getByTestId, getByText } = render(<NoteContent note={note} />);

    const button = getByTestId(NOTE_CONTENT_BUTTON_TEST_ID);

    expect(button).toBeInTheDocument();
    expect(getByText(note)).toBeInTheDocument();

    button.click();

    expect(getByTestId(NOTE_CONTENT_POPOVER_TEST_ID)).toBeInTheDocument();
  });
});
