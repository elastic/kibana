/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { useCurrentUser } from '../../../../common/lib/kibana/hooks';

import { securityMock } from '@kbn/security-plugin/public/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { AddNote } from '.';

const mockDispatch = jest.fn();
jest.mock('react-redux-v7', () => {
  const original = jest.requireActual('react-redux-v7');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../../common/lib/kibana/hooks');

describe('AddNote', () => {
  let authenticatedUser: AuthenticatedUser;

  beforeEach(() => {
    (useCurrentUser as jest.Mock).mockReturnValue(authenticatedUser);
    authenticatedUser = securityMock.createMockAuthenticatedUser({
      roles: ['superuser'],
    });
  });
  const note = 'The contents of a new note';
  const props = {
    associateNote: jest.fn(),
    newNote: note,
    onCancelAddNote: jest.fn(),
    updateNewNote: jest.fn(),
    setIsMarkdownInvalid: jest.fn(),
  };

  test('renders correctly', () => {
    render(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );
    expect(screen.getByTestId('add-a-note')).toBeInTheDocument();
  });

  test('it renders the Cancel button when onCancelAddNote is provided', () => {
    render(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );

    expect(screen.getByTestId('cancel')).toBeInTheDocument();
  });

  test('it invokes onCancelAddNote when the Cancel button is clicked', () => {
    const onCancelAddNote = jest.fn();
    const testProps = {
      ...props,
      onCancelAddNote,
    };

    render(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('cancel'));

    expect(onCancelAddNote).toHaveBeenCalled();
  });

  test('it does NOT invoke associateNote when the Cancel button is clicked', () => {
    const associateNote = jest.fn();
    const testProps = {
      ...props,
      associateNote,
    };

    render(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('cancel'));

    expect(associateNote).not.toHaveBeenCalled();
  });

  test('it does NOT render the Cancel button when onCancelAddNote is NOT provided', () => {
    const testProps = {
      ...props,
      onCancelAddNote: undefined,
    };
    render(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('cancel')).not.toBeInTheDocument();
  });

  test('it renders the contents of the note', () => {
    render(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );

    expect(screen.getByTestId('add-a-note')).toHaveTextContent(note);
  });

  test('it invokes associateNote when the Add Note button is clicked', () => {
    const associateNote = jest.fn();
    const testProps = {
      ...props,
      newNote: note,
      associateNote,
    };
    render(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('add-note'));

    expect(associateNote).toHaveBeenCalled();
  });

  // test('it invokes getNewNoteId when the Add Note button is clicked', () => {
  //   const getNewNoteId = jest.fn();
  //   const testProps = {
  //     ...props,
  //     getNewNoteId,
  //   };

  //   render(<AddNote {...testProps} />);

  //   wrapper.find('[data-test-subj="add-note"]').first().simulate('click');

  //   expect(getNewNoteId).toHaveBeenCalled();
  // });

  test('it invokes updateNewNote when the Add Note button is clicked', () => {
    const updateNewNote = jest.fn();
    const testProps = {
      ...props,
      updateNewNote,
    };

    render(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('add-note'));

    expect(updateNewNote).toHaveBeenCalled();
  });

  test('it invokes updateNote when the Add Note button is clicked', () => {
    render(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('add-note'));

    expect(mockDispatch).toHaveBeenCalled();
  });
});
