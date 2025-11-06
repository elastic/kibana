/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
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
  const mount = useMountAppended();

  const allProps = {
    scopeId: 'some_scope',
    contextId: 'test',
    eventId: '1',
    fileHashSha256: undefined,
  };

  test('displays the fileHashSha256 when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileHash {...allProps} fileHashSha256="[fileHashSha256]" />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[fileHashSha256]');
  });

  test('displays nothing when fileHashSha256 is null', () => {
    const wrapper = mount(
      <TestProviders>
        <FileHash {...allProps} fileHashSha256={null} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('displays nothing when fileHashSha256 is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <FileHash {...allProps} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });
  test('should passing correct scopeId to cell actions', () => {
    mount(
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
