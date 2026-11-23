/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../../common/mock';
import { ProcessDraggable, ProcessDraggableWithNonExistentProcess } from './process_draggable';
import { CellActionsRenderer } from '../../../../../common/components/cell_actions/cell_actions_renderer';

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

describe('ProcessDraggable', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });
  describe('rendering', () => {
    test('it renders the process name and pid with cell actions', () => {
      render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={456}
            endgameProcessName="endgame-process-name-123"
            eventId="event-123"
            processExecutable="process-executable-1"
            processName="process-name-1"
            processPid={123}
          />
        </TestProviders>
      );
      expect(screen.getAllByTestId('mock-cell-action-renderer').length).toBeGreaterThan(0);
      expect(screen.getByText('process-name-1')).toBeInTheDocument();
      expect(screen.getByText('(123)')).toBeInTheDocument();
    });

    test('it returns null if everything is null', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={null}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable={null}
            processName={null}
            processPid={null}
          />
        </TestProviders>
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns null if everything is undefined', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns process name if that is all that is passed in', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable={undefined}
            processName="[process-name]"
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-name]');
    });

    test('it returns process executable if that is all that is passed in', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={null}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable]');
    });

    test('it returns process pid if that is all that is passed in', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={null}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable={null}
            processName={null}
            processPid={123}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('(123)');
    });

    test('it returns just process name if process.pid and endgame.pid are NaN', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable=""
            processName="[process-name]"
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-name]');
    });

    test('it returns just process executable if process.pid and endgame.pid are NaN', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable]');
    });

    test('it returns process executable if everything else is an empty string or NaN', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName=""
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable]');
    });

    test('it returns endgame.process_name if everything else is an empty string or NaN', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={NaN}
            endgameProcessName="[endgame-process_name]"
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[endgame-process_name]');
    });

    test('it returns endgame.process_name and endgame.pid if everything else is an empty string or undefined', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={456}
            endgameProcessName="[endgame-process_name]"
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[endgame-process_name](456)');
    });

    test('it returns process pid if everything else is an empty string', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={456}
            endgameProcessName=""
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={123}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('(123)');
    });

    test('it returns endgame.pid if everything else is an empty string', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={456}
            endgameProcessName=""
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('(456)');
    });

    test('it returns pid and process name if everything is filled', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={456}
            endgameProcessName="[endgame-process_name]"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName="[process-name]"
            processPid={123}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-name](123)');
    });

    test('it returns process pid and executable and if process name and endgame process name are null', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={null}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={null}
            processPid={123}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable](123)');
    });

    test('it returns endgame pid and executable and if process name and endgame process name are null', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={456}
            endgameProcessName={null}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={null}
            processPid={null}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable](456)');
    });

    test('it returns process pid and executable and if process name is undefined', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={undefined}
            processPid={123}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable](123)');
    });

    test('it returns process pid and executable if process name is an empty string', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={null}
            endgameProcessName=""
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={123}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable](123)');
    });

    test('it prefers process.name when process.executable and endgame.process_name are also provided', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={null}
            endgameProcessName="[endgame-process-name]"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName="[process-name]"
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-name]');
    });

    test('it falls back to rendering process.executable when process.name is NOT provided, but process.executable and endgame.process_name are provided', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={null}
            endgameProcessName="[endgame-process-name]"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[process-executable]');
    });

    test('it falls back to rendering endgame.process_name when process.name and process.executable are NOT provided', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={null}
            endgameProcessName="[endgame-process-name]"
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('[endgame-process-name]');
    });

    test('it prefers process.pid when endgame.pid is also provided', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={999}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={123}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('(123)');
    });

    test('it falls back to rendering endgame.pid when process.pid is NOT provided', () => {
      const { container } = render(
        <TestProviders>
          <ProcessDraggable
            scopeId="some_scope"
            contextId="context-123"
            endgamePid={999}
            endgameProcessName={undefined}
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual('(999)');
    });
  });

  test('should passing correct scopeId to cell actions', () => {
    render(
      <TestProviders>
        <ProcessDraggable
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={999}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
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

describe('ProcessDraggableWithNonExistentProcess', () => {
  test('it renders the expected text when all fields are undefined', () => {
    const { container } = render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('an unknown process');
  });

  test('it renders the expected text when just endgamePid is provided', () => {
    const { container } = render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={999}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('(999)');
  });

  test('it renders the expected text when just endgameProcessName is provided', () => {
    const { container } = render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName="[endgameProcessName]"
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('[endgameProcessName]');
  });

  test('it renders the expected text when just processExecutable is provided', () => {
    const { container } = render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable="[processExecutable]"
          processName={undefined}
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('[processExecutable]');
  });

  test('it renders the expected text when just processName is provided', () => {
    const { container } = render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName="[processName]"
          processPid={undefined}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('[processName]');
  });

  test('it renders the expected text when just processPid is provided', () => {
    const { container } = render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId="event-123"
          processExecutable={undefined}
          processName={undefined}
          processPid={123}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('(123)');
  });

  test('it renders the expected text when all values are provided', () => {
    const { container } = render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={999}
          endgameProcessName="[endgameProcessName]"
          eventId="event-123"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('[processName](123)');
  });

  test('should passing correct scopeId to cell actions', () => {
    render(
      <TestProviders>
        <ProcessDraggableWithNonExistentProcess
          scopeId="some_scope"
          contextId="context-123"
          endgamePid={999}
          endgameProcessName="[endgameProcessName]"
          eventId="event-123"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
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
