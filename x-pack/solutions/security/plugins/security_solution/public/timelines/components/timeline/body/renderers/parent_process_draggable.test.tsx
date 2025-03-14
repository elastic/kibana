/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../../common/mock';

import { ParentProcessDraggable } from './parent_process_draggable';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
import { CellActionsWrapper } from '../../../../../common/components/drag_and_drop/cell_actions_wrapper';

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

describe('ParentProcessDraggable', () => {
  beforeEach(() => {
    (CellActionsWrapper as unknown as jest.Mock).mockImplementation(MockedCellActionsWrapper);
  });
  const mount = useMountAppended();

  test('displays the text, endgameParentProcessName, processParentName, processParentPid, and processPpid when they are all provided', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          scopeId="some_scope"
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processParentName="[processParentName]"
          processParentPid={789}
          processPpid={456}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'via parent process[processParentName][endgameParentProcessName](789)(456)'
    );
  });

  test('displays nothing when the text is provided, but endgameParentProcessName and processParentName are both undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          scopeId="some_scope"
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processParentName={undefined}
          processParentPid={undefined}
          processPpid={undefined}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('displays the text and endgameParentProcessName when processPpid is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          scopeId="some_scope"
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processParentName={undefined}
          processParentPid={undefined}
          processPpid={undefined}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('via parent process[endgameParentProcessName]');
  });

  test('displays the text and processParentName when processParentPid is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          scopeId="some_scope"
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processParentName="[processParentName]"
          processParentPid={undefined}
          processPpid={undefined}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('via parent process[processParentName]');
  });

  test('displays the endgameParentProcessName when both processPpid and text are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          scopeId="some_scope"
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processParentName={undefined}
          processParentPid={undefined}
          processPpid={undefined}
          text={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[endgameParentProcessName]');
  });

  test('displays the processParentName when both processParentPid and text are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          scopeId="some_scope"
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processParentName="[processParentName]"
          processParentPid={undefined}
          processPpid={undefined}
          text={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[processParentName]');
  });

  test('should passing correct scopeId to cell actions', () => {
    mount(
      <TestProviders>
        <ParentProcessDraggable
          scopeId="some_scope"
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processParentName="[processParentName]"
          processParentPid={undefined}
          processPpid={undefined}
          text={undefined}
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
