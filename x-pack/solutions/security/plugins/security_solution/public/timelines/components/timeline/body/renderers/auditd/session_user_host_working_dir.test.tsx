/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../../../../common/mock';
import { SessionUserHostWorkingDir } from './session_user_host_working_dir';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('SessionUserHostWorkingDir', () => {
  describe('rendering', () => {
    test('it renders with just eventId and contextId', () => {
      const { container } = render(
        <TestProviders>
          <EuiFlexItem grow={false} component="span">
            <SessionUserHostWorkingDir
              eventId="eventid-123"
              scopeId="some_scope"
              contextId="contextid-123"
              session={undefined}
              hostName={undefined}
              userName={undefined}
              primary={undefined}
              secondary={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(container.textContent).toEqual('Session');
    });

    test('it renders with only eventId, contextId, session', () => {
      const { container } = render(
        <TestProviders>
          <EuiFlexItem grow={false} component="span">
            <SessionUserHostWorkingDir
              eventId="eventid-123"
              scopeId="some_scope"
              contextId="contextid-123"
              session="session-123"
              hostName={undefined}
              userName={undefined}
              primary={undefined}
              secondary={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(container.textContent).toEqual('Sessionsession-123');
    });

    test('it renders with only eventId, contextId, session, hostName', () => {
      const { container } = render(
        <TestProviders>
          <EuiFlexItem grow={false} component="span">
            <SessionUserHostWorkingDir
              eventId="eventid-123"
              scopeId="some_scope"
              contextId="contextid-123"
              session="session-123"
              hostName="hostname-123"
              userName={undefined}
              primary={undefined}
              secondary={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(container.textContent).toEqual('Sessionsession-123@hostname-123');
    });

    test('it renders with only eventId, contextId, session, hostName, userName', () => {
      const { container } = render(
        <TestProviders>
          <EuiFlexItem grow={false} component="span">
            <SessionUserHostWorkingDir
              eventId="eventid-123"
              scopeId="some_scope"
              contextId="contextid-123"
              session="session-123"
              hostName="hostname-123"
              userName="username-123"
              primary={undefined}
              secondary={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(container.textContent).toEqual('Sessionsession-123username-123@hostname-123');
    });

    test('it renders with only eventId, contextId, session, hostName, userName, primary', () => {
      const { container } = render(
        <TestProviders>
          <EuiFlexItem grow={false} component="span">
            <SessionUserHostWorkingDir
              eventId="eventid-123"
              scopeId="some_scope"
              contextId="contextid-123"
              session="session-123"
              hostName="hostname-123"
              userName="username-123"
              primary="primary-123"
              secondary={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(container.textContent).toEqual('Sessionsession-123primary-123@hostname-123');
    });

    test('it renders with only eventId, contextId, session, hostName, userName, primary, secondary', () => {
      const { container } = render(
        <TestProviders>
          <EuiFlexItem grow={false} component="span">
            <SessionUserHostWorkingDir
              eventId="eventid-123"
              scopeId="some_scope"
              contextId="contextid-123"
              session="session-123"
              hostName="hostname-123"
              userName="username-123"
              primary="primary-123"
              secondary="secondary-123"
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(container.textContent).toEqual(
        'Sessionsession-123primary-123assecondary-123@hostname-123'
      );
    });

    test('it renders with everything as expected', () => {
      const { container } = render(
        <TestProviders>
          <EuiFlexItem grow={false} component="span">
            <SessionUserHostWorkingDir
              eventId="eventid-123"
              scopeId="some_scope"
              contextId="contextid-123"
              session="session-123"
              hostName="hostname-123"
              userName="username-123"
              primary="primary-123"
              secondary="secondary-123"
              workingDirectory="workingdirectory-123"
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(container.textContent).toEqual(
        'Sessionsession-123primary-123assecondary-123@hostname-123inworkingdirectory-123'
      );
    });
  });
});
