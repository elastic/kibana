/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AuthSsh } from './auth_ssh';
import { CellActionsRenderer } from '../../../../../../common/components/cell_actions/cell_actions_renderer';

jest.mock('../../../../../../common/components/cell_actions/cell_actions_renderer', () => {
  return {
    CellActionsRenderer: jest.fn(),
  };
});

const MockedCellActionsRenderer = jest.fn(({ children }) => {
  return <div data-test-subj="mock-cell-action-renderer">{children}</div>;
});

describe('AuthSsh', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });
  describe('rendering', () => {
    test('it renders both the signature and the method', () => {
      render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature="[ssh-signature]"
          sshMethod="[ssh-method]"
        />
      );
      expect(screen.getByText('[ssh-signature]')).toBeInTheDocument();
      expect(screen.getByText('[ssh-method]')).toBeInTheDocument();
    });

    test('it returns null if sshSignature and sshMethod are both null', () => {
      const { container } = render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={null}
          sshMethod={null}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns null if sshSignature and sshMethod are both undefined', () => {
      const { container } = render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={undefined}
          sshMethod={undefined}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns null if sshSignature is null and sshMethod is undefined', () => {
      const { container } = render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={null}
          sshMethod={undefined}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns null if sshSignature is undefined and sshMethod is null', () => {
      const { container } = render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={undefined}
          sshMethod={null}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns sshSignature if sshMethod is null', () => {
      const { container } = render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature="[sshSignature-1]"
          sshMethod={null}
        />
      );
      expect(screen.getByText('[sshSignature-1]')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-cell-action-renderer')).toHaveLength(1);
    });

    test('it returns sshMethod if sshSignature is null', () => {
      const { container } = render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={null}
          sshMethod="[sshMethod-1]"
        />
      );
      expect(screen.getByText('[sshMethod-1]')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-cell-action-renderer')).toHaveLength(1);
    });

    test('should passing correct scopeId to cell actions', () => {
      render(
        <AuthSsh
          scopeId="some_scope"
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={null}
          sshMethod="[sshMethod-1]"
        />
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
