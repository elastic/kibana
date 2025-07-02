/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
import { CellActionsWrapper } from '../../../../../common/components/drag_and_drop/cell_actions_wrapper';

import { ExitCodeDraggable } from './exit_code_draggable';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../common/components/drag_and_drop/cell_actions_wrapper', () => {
  return {
    CellActionsWrapper: jest.fn(),
  };
});

const MockedCellActionsWrapper = jest.fn(({ children }) => {
  return <div data-test-subj="mock-cell-action-wrapper">{children}</div>;
});

describe('ExitCodeDraggable', () => {
  beforeEach(() => {
    (CellActionsWrapper as unknown as jest.Mock).mockImplementation(MockedCellActionsWrapper);
  });
  const mount = useMountAppended();

  test('it renders the expected text and exit codes, when text, processExitCode, and an endgameExitCode are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode="0"
          eventId="1"
          processExitCode={-1}
          text="with exit code"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('with exit code-10');
  });

  test('it returns an empty string when text is provided, but processExitCode and endgameExitCode are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode={undefined}
          eventId="1"
          processExitCode={undefined}
          text="with exit code"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it returns an empty string when text is provided, but processExitCode and endgameExitCode are null', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode={null}
          eventId="1"
          processExitCode={null}
          text="with exit code"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it returns an empty string when text is provided, but endgameExitCode is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode=""
          eventId="1"
          processExitCode={undefined}
          text="with exit code"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it renders just the endgameExitCode code when text is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode="1"
          eventId="1"
          processExitCode={undefined}
          text={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('it renders just the processExitCode code when text is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode={undefined}
          eventId="1"
          processExitCode={-1}
          text={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('-1');
  });

  test('it renders just the endgameExitCode code when text is null', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode="1"
          eventId="1"
          processExitCode={undefined}
          text={null}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('it renders just the processExitCode code when text is null', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode={undefined}
          eventId="1"
          processExitCode={-1}
          text={null}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('-1');
  });

  test('it renders just the endgameExitCode code when text is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode="1"
          eventId="1"
          processExitCode={undefined}
          text=""
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('it renders just the processExitCode code when text is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode={undefined}
          eventId="1"
          processExitCode={-1}
          text=""
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('-1');
  });

  test('should passing correct scopeId to cell actions', () => {
    mount(
      <TestProviders>
        <ExitCodeDraggable
          scopeId="some_scope"
          contextId="test"
          endgameExitCode={undefined}
          eventId="1"
          processExitCode={-1}
          text=""
        />
      </TestProviders>
    );

    expect(MockedCellActionsWrapper).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeId: 'some_scope',
      }),
      {}
    );
  });
});
