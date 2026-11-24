/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../../../common/mock';
import { Package } from './package';
import { CellActionsRenderer } from '../../../../../../common/components/cell_actions/cell_actions_renderer';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/cell_actions/cell_actions_renderer', () => {
  return {
    CellActionsRenderer: jest.fn(),
  };
});

const MockedCellActionsRenderer = jest.fn(({ children }) => {
  return <div data-test-subj="mock-cell-action-renderer">{children}</div>;
});

describe('Package', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });
  describe('rendering', () => {
    test('it renders the package name, version and summary', () => {
      render(
        <TestProviders>
          <Package
            scopeId="some_scope"
            contextId="[context-123]"
            eventId="[event-123]"
            packageName="package-name-123"
            packageSummary="package-summary-123"
            packageVersion="package-version-123"
          />
        </TestProviders>
      );
      expect(screen.getByText('package-name-123')).toBeInTheDocument();
      expect(screen.getByText('package-version-123')).toBeInTheDocument();
      expect(screen.getByText('package-summary-123')).toBeInTheDocument();
    });

    test('it returns null if all of the package information is null ', () => {
      const { container } = render(
        <Package
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          packageName={null}
          packageSummary={null}
          packageVersion={null}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns null if all of the package information is undefined ', () => {
      const { container } = render(
        <Package
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          packageName={undefined}
          packageSummary={undefined}
          packageVersion={undefined}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns just the package name', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary={undefined}
              packageVersion={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('[package-name-123]');
    });

    test('it returns just the package name and package summary', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('[package-name-123][package-summary-123]');
    });

    test('it returns just the package name, package summary, package version', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion="[package-version-123]"
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual(
        '[package-name-123][package-version-123][package-summary-123]'
      );
    });

    test('should passing correct scopeId to cell actions', () => {
      render(
        <TestProviders>
          <div>
            <Package
              scopeId="some_scope"
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion="[package-version-123]"
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
