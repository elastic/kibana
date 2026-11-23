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

import { FileHash } from './file_hash';

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

describe('FileHash', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });
  const allProps = {
    scopeId: 'some_scope',
    contextId: 'test',
    eventId: '1',
    fileHashSha256: undefined,
  };

  test('displays the fileHashSha256 when provided', () => {
    const { container } = render(
      <TestProviders>
        <FileHash {...allProps} fileHashSha256="[fileHashSha256]" />
      </TestProviders>
    );
    expect(container.textContent).toEqual('[fileHashSha256]');
  });

  test('displays nothing when fileHashSha256 is null', () => {
    const { container } = render(
      <TestProviders>
        <FileHash {...allProps} fileHashSha256={null} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('displays nothing when fileHashSha256 is undefined', () => {
    const { container } = render(
      <TestProviders>
        <FileHash {...allProps} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });
  test('should passing correct scopeId to cell actions', () => {
    render(
      <TestProviders>
        <FileHash {...allProps} />
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
