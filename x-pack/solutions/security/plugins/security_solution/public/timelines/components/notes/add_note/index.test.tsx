/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { useCurrentUser } from '../../../../common/lib/kibana/hooks';

import { securityMock } from '@kbn/security-plugin/public/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { AddNote } from '.';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

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
    const wrapper = mount(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );
    expect(wrapper.find('AddNote').exists()).toBeTruthy();
  });

  test('it renders the Cancel button when onCancelAddNote is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="cancel"]').exists()).toEqual(true);
  });

  test('it invokes onCancelAddNote when the Cancel button is clicked', () => {
    const onCancelAddNote = jest.fn();
    const testProps = {
      ...props,
      onCancelAddNote,
    };

    const wrapper = mount(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="cancel"]').first().simulate('click');

    expect(onCancelAddNote).toBeCalled();
  });

  test('it does NOT invoke associateNote when the Cancel button is clicked', () => {
    const associateNote = jest.fn();
    const testProps = {
      ...props,
      associateNote,
    };

    const wrapper = mount(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="cancel"]').first().simulate('click');

    expect(associateNote).not.toBeCalled();
  });

  test('it does NOT render the Cancel button when onCancelAddNote is NOT provided', () => {
    const testProps = {
      ...props,
      onCancelAddNote: undefined,
    };
    const wrapper = mount(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="cancel"]').exists()).toEqual(false);
  });

  test('it renders the contents of the note', () => {
    const wrapper = mount(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="add-a-note"] .euiMarkdownEditorDropZone').first().text()
    ).toEqual(note);
  });

  test('it invokes associateNote when the Add Note button is clicked', () => {
    const associateNote = jest.fn();
    const testProps = {
      ...props,
      newNote: note,
      associateNote,
    };
    const wrapper = mount(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="add-note"]').first().simulate('click');

    expect(associateNote).toBeCalled();
  });

  // test('it invokes getNewNoteId when the Add Note button is clicked', () => {
  //   const getNewNoteId = jest.fn();
  //   const testProps = {
  //     ...props,
  //     getNewNoteId,
  //   };

  //   const wrapper = mount(<AddNote {...testProps} />);

  //   wrapper.find('[data-test-subj="add-note"]').first().simulate('click');

  //   expect(getNewNoteId).toBeCalled();
  // });

  test('it invokes updateNewNote when the Add Note button is clicked', () => {
    const updateNewNote = jest.fn();
    const testProps = {
      ...props,
      updateNewNote,
    };

    const wrapper = mount(
      <TestProviders>
        <AddNote {...testProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="add-note"]').first().simulate('click');

    expect(updateNewNote).toBeCalled();
  });

  test('it invokes updateNote when the Add Note button is clicked', () => {
    const wrapper = mount(
      <TestProviders>
        <AddNote {...props} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="add-note"]').first().simulate('click');

    expect(mockDispatch).toBeCalled();
  });
});
