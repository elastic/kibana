/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../../common/mock';
import { UserHostWorkingDir } from './user_host_working_dir';
import { SecurityCellActions } from '../../../../../common/components/cell_actions';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../common/components/cell_actions', () => {
  return {
    SecurityCellActions: jest.fn(),
    CellActionsMode: {
      HOVER_DOWN: 'hover-down',
      HOVER_RIGHT: 'hover-right',
      INLINE: 'inline',
    },
    SecurityCellActionsTrigger: {
      DEFAULT: 'default',
    },
  };
});

const MockedSecurityCellActions = jest.fn(({ children }) => {
  return <div data-test-subj="mock-security-cell-actions">{children}</div>;
});

describe('UserHostWorkingDir', () => {
  beforeEach(() => {
    (SecurityCellActions as unknown as jest.Mock).mockImplementation(MockedSecurityCellActions);
  });
  describe('rendering', () => {
    test('it renders all provided values', () => {
      const { container } = render(
        <TestProviders>
          <UserHostWorkingDir
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            userDomain="[userDomain-123]"
            userName="[userName-123]"
            hostName="[hostName-123]"
            workingDirectory="[working-directory-123]"
          />
        </TestProviders>
      );
      expect(container.textContent).toEqual(
        '[userName-123]\\[userDomain-123]@[hostName-123]in[working-directory-123]'
      );
    });

    test('it returns null if userDomain, userName, hostName, and workingDirectory are all null', () => {
      const { container } = render(
        <UserHostWorkingDir
          scopeId="some_scope"
          contextId="context-123"
          eventId="event-123"
          userDomain={null}
          userName={null}
          hostName={null}
          workingDirectory={null}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns null if userDomain, userName, hostName, and workingDirectory are all undefined', () => {
      const { container } = render(
        <UserHostWorkingDir
          scopeId="some_scope"
          contextId="context-123"
          eventId="event-123"
          userDomain={undefined}
          userName={undefined}
          hostName={undefined}
          workingDirectory={undefined}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    test('it returns userDomain if that is the only attribute defined', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userName={undefined}
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('\\[user-domain-123]');
    });

    test('it returns userName if that is the only attribute defined', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName="[user-name-123]"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('[user-name-123]');
    });

    test('it returns hostName if that is the only attribute defined', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName={null}
              hostName="[host-name-123]"
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('[host-name-123]');
    });

    test('it returns "in" + workingDirectory if that is the only attribute defined', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName={null}
              hostName={null}
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('in[working-directory-123]');
    });

    test('it returns userName and workingDirectory', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName="[user-name-123]"
              hostName={null}
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('[user-name-123]in[working-directory-123]');
    });

    test('it returns hostName and workingDirectory', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName={null}
              hostName="[host-name-123]"
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('[host-name-123]in[working-directory-123]');
    });

    test('it returns userName, userDomain, hostName', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userName="[user-name-123]"
              hostName="[host-name-123]"
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(container.textContent).toEqual('[user-name-123]\\[user-domain-123]@[host-name-123]');
    });

    test('it returns hostName and userName with the default hostNameSeparator "@", when hostNameSeparator is NOT specified as a prop', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName="[user-name-123]"
              hostName="[host-name-123]"
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(container.textContent).toEqual('[user-name-123]@[host-name-123]');
    });

    test('it returns hostName and userName with an overridden hostNameSeparator, when hostNameSeparator is specified as a prop', () => {
      const { container } = render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              hostNameSeparator="custom separator"
              userDomain={null}
              userName="[user-name-123]"
              hostName="[host-name-123]"
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(container.textContent).toEqual('[user-name-123]custom separator[host-name-123]');
    });

    test('it renders `user.domain` field (by default) when userDomain is provided, and userDomainField is NOT specified as a prop', () => {
      render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userName={undefined}
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(screen.getByTestId('render-content-user.domain')).toBeInTheDocument();
    });

    test('it renders with an overridden field name when userDomain is provided, and userDomainField is also specified as a prop', () => {
      render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userDomainField="overridden.field.name"
              userName={undefined}
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(screen.getByTestId('render-content-overridden.field.name')).toBeInTheDocument();
    });

    test('it renders a `user.name` field (by default) when userName is provided, and userNameField is NOT specified as a prop', () => {
      render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName="[user-name-123]"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(screen.getByTestId('render-content-user.name')).toBeInTheDocument();
    });

    test('it renders with an overridden field name when userName is provided, and userNameField is also specified as a prop', () => {
      render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName="[user-name-123]"
              userNameField="overridden.field.name"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(screen.getByTestId('render-content-overridden.field.name')).toBeInTheDocument();
    });

    test('should passing correct scopeId to cell actions', () => {
      render(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              scopeId="some_scope"
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName="[user-name-123]"
              userNameField="overridden.field.name"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(MockedSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            scopeId: 'some_scope',
          }),
        }),
        {}
      );
    });
  });
});
