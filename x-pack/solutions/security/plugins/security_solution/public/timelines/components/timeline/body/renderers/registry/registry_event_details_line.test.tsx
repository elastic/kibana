/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../../../../common/mock';
import { RegistryEventDetailsLine } from './registry_event_details_line';
import { MODIFIED_REGISTRY_KEY } from '../system/translations';
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

describe('DnsRequestEventDetailsLine', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });

  const allProps = {
    scopeId: 'some_scope',
    contextId: 'test',
    hostName: '[hostName]',
    id: '1',
    processName: '[processName]',
    processPid: 123,
    registryKey: '[registryKey]',
    registryPath: '[registryPath]',
    text: MODIFIED_REGISTRY_KEY,
    userDomain: '[userDomain]',
    userName: '[userName]',
  };

  test('it renders the expected text when all properties are provided', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });

  test('it returns an empty string when when registryKey is null', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} registryKey={null} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('it returns an empty string when registryKey is undefined', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} registryKey={undefined} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('it renders the expected text when hostName is NOT provided', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} hostName={undefined} />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      '[userName]\\[userDomain]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });

  test('it renders the expected text when processName is NOT provided', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} processName={undefined} />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]with new value[registryPath]via(123)'
    );
  });

  test('it renders the expected text when processPid is NOT provided', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} processPid={undefined} />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]with new value[registryPath]via[processName]'
    );
  });

  test('it renders the expected text when registryPath is NOT provided', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} registryPath={undefined} />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]via[processName](123)'
    );
  });

  test('it renders the expected text when userDomain is NOT provided', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} userDomain={undefined} />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      '[userName]@[hostName]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });

  test('it renders the expected text when userName is NOT provided', () => {
    const { container } = render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} userName={undefined} />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      '\\[userDomain][hostName]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });

  test('should passing correct scopeId to cell actions', () => {
    render(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} userName={undefined} />
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
