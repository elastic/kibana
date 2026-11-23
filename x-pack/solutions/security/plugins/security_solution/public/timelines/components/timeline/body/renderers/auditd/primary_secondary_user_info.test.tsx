/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../../../../common/mock';
import { PrimarySecondaryUserInfo, nilOrUnSet } from './primary_secondary_user_info';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('UserPrimarySecondary', () => {
  describe('rendering', () => {
    test('should render user name only if that is all that is present', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            userName="user-name-1"
            primary={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('user-name-1');
    });

    test('should render user name only if the others are in unset mode', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            userName="user-name-1"
            primary="unset"
            secondary="unset"
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('user-name-1');
    });

    test('should render primary name only if that is all that is present', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            primary="primary-1"
            userName={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('primary-1');
    });

    test('should render primary name only if the others are in unset mode', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            primary="primary-1"
            userName="unset"
            secondary="unset"
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('primary-1');
    });

    test('should render the secondary name only if that is all that is present', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            userName={undefined}
            primary={undefined}
            secondary="secondary-1"
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('secondary-1');
    });

    test('should render the secondary name only if the others are in unset mode', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            secondary="secondary-1"
            primary="unset"
            userName="unset"
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('secondary-1');
    });

    test('should render the user name if all three are the same', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            userName="username-1"
            primary="username-1"
            secondary="username-1"
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('username-1');
    });

    test('should render the primary with as if all three are different', () => {
      const { container } = render(
        <TestProviders>
          <PrimarySecondaryUserInfo
            scopeId="some_scope"
            contextId="context-123"
            eventId="event-123"
            userName="[username]"
            primary="[primary]"
            secondary="[secondary]"
          />
        </TestProviders>
      );
      expect(container.textContent).toBe('[primary]as[secondary]');
    });
  });

  describe('#nilOrUnSet', () => {
    test('should return true if the value is undefined', () => {
      expect(nilOrUnSet()).toEqual(true);
    });

    test('should return true if the value is null', () => {
      expect(nilOrUnSet()).toEqual(true);
    });

    test('should return true if the value is unset', () => {
      expect(nilOrUnSet('unset')).toEqual(true);
    });

    test('should return true if the value is UnSeT', () => {
      expect(nilOrUnSet('UnSeT')).toEqual(true);
    });

    test('should return false if the value is unset with an extra space', () => {
      expect(nilOrUnSet('unset ')).toEqual(false);
    });

    test('should return false if the value is string named user-1', () => {
      expect(nilOrUnSet('user-1')).toEqual(false);
    });
  });
});
