/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../../common/mock';
import { ArgsComponent } from './args';
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

describe('Args', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });

  describe('rendering', () => {
    test('it renders each arg and the process title as badges', () => {
      render(
        <TestProviders>
          <ArgsComponent
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            args={['arg1', 'arg2', 'arg3']}
            processTitle="process-title-1"
          />
        </TestProviders>
      );
      expect(screen.getAllByTestId('mock-cell-action-renderer')).toHaveLength(4);
      ['arg1', 'arg2', 'arg3', 'process-title-1'].forEach((text) =>
        expect(screen.getByText(text)).toBeInTheDocument()
      );
    });

    test('it returns an empty string when both args and process title are undefined', () => {
      const { container } = render(
        <TestProviders>
          <ArgsComponent
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            args={undefined}
            processTitle={undefined}
          />
        </TestProviders>
      );
      expect(container).toHaveTextContent(/^$/);
    });

    test('it returns an empty string when both args and process title are null', () => {
      const { container } = render(
        <TestProviders>
          <ArgsComponent
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            args={null}
            processTitle={null}
          />
        </TestProviders>
      );
      expect(container).toHaveTextContent(/^$/);
    });

    test('it returns an empty string when args is an empty array, and title is an empty string', () => {
      const { container } = render(
        <TestProviders>
          <ArgsComponent
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            args={[]}
            processTitle=""
          />
        </TestProviders>
      );
      expect(container).toHaveTextContent(/^$/);
    });

    test('it returns args when args are provided, and process title is NOT provided', () => {
      const { container } = render(
        <TestProviders>
          <ArgsComponent
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            args={['arg1', 'arg2', 'arg3']}
            processTitle={undefined}
          />
        </TestProviders>
      );
      expect(container).toHaveTextContent('arg1arg2arg3');
    });

    test('it returns process title when process title is provided, and args is NOT provided', () => {
      const { container } = render(
        <TestProviders>
          <ArgsComponent
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            args={null}
            processTitle="process-title-1"
          />
        </TestProviders>
      );
      expect(container).toHaveTextContent('process-title-1');
    });

    test('it returns both args and process title, when both are provided', () => {
      const { container } = render(
        <TestProviders>
          <ArgsComponent
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            args={['arg1', 'arg2', 'arg3']}
            processTitle="process-title-1"
          />
        </TestProviders>
      );
      expect(container).toHaveTextContent('arg1arg2arg3process-title-1');
    });

    test('should passing correct scopeId to cell actions', () => {
      render(
        <TestProviders>
          <div>
            <ArgsComponent
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              args={['arg1', 'arg2', 'arg3']}
              processTitle="process-title-1"
            />
          </div>
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
});
