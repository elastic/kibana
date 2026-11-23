/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../../../common/mock';
import { CellActionsRenderer } from '../../../../../common/components/cell_actions/cell_actions_renderer';

import { ExitCodeDraggable } from './exit_code_draggable';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../common/components/cell_actions/cell_actions_renderer', () => {
  return {
    CellActionsRenderer: jest.fn(),
  };
});

const MockedCellActionsRenderer = jest.fn(({ children }) => {
  return <div data-test-subj="mock-cell-action-renderer">{children}</div>;
});

describe('ExitCodeDraggable', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });
  test('it renders the expected text and exit codes, when text, processExitCode, and an endgameExitCode are provided', () => {
    const { container } = render(
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
    expect(container.textContent).toEqual('with exit code-10');
  });

  test('it returns an empty string when text is provided, but processExitCode and endgameExitCode are undefined', () => {
    const { container } = render(
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
    expect(container).toBeEmptyDOMElement();
  });

  test('it returns an empty string when text is provided, but processExitCode and endgameExitCode are null', () => {
    const { container } = render(
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
    expect(container).toBeEmptyDOMElement();
  });

  test('it returns an empty string when text is provided, but endgameExitCode is an empty string', () => {
    const { container } = render(
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
    expect(container).toBeEmptyDOMElement();
  });

  test('it renders just the endgameExitCode code when text is undefined', () => {
    const { container } = render(
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
    expect(container.textContent).toEqual('1');
  });

  test('it renders just the processExitCode code when text is undefined', () => {
    const { container } = render(
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
    expect(container.textContent).toEqual('-1');
  });

  test('it renders just the endgameExitCode code when text is null', () => {
    const { container } = render(
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
    expect(container.textContent).toEqual('1');
  });

  test('it renders just the processExitCode code when text is null', () => {
    const { container } = render(
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
    expect(container.textContent).toEqual('-1');
  });

  test('it renders just the endgameExitCode code when text is an empty string', () => {
    const { container } = render(
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
    expect(container.textContent).toEqual('1');
  });

  test('it renders just the processExitCode code when text is an empty string', () => {
    const { container } = render(
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
    expect(container.textContent).toEqual('-1');
  });

  test('should passing correct scopeId to cell actions', () => {
    render(
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

    expect(MockedCellActionsRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeId: 'some_scope',
      }),
      {}
    );
  });
});
