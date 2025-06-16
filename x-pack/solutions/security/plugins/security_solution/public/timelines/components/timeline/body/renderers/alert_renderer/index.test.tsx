/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { omit } from 'lodash/fp';
import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TestProviders } from '../../../../../../common/mock';
import {
  DESTINATION_IP,
  DESTINATION_PORT,
  EVENT_CATEGORY,
  FILE_NAME,
  HOST_NAME,
  KIBANA_ALERT_RULE_NAME,
  KIBANA_ALERT_SEVERITY,
  PROCESS_NAME,
  PROCESS_PARENT_NAME,
  SOURCE_IP,
  SOURCE_PORT,
  USER_NAME,
  WITH_FIELD_NAMES,
} from './helpers';
import { alertRenderer } from '.';
import { TimelineId } from '../../../../../../../common/types/timeline';

const dataWithAllFields: Ecs = {
  _id: 'abcd',
  destination: {
    ip: ['10.0.0.1'],
    port: [5678],
  },
  event: {
    category: ['network'],
    kind: ['signal'], // <-- this makes it an alert
  },
  file: {
    name: ['mimikatz.exe'],
  },
  host: {
    name: ['gracious'],
  },
  kibana: {
    alert: {
      rule: {
        name: ['panic'],
        parameters: {},
        uuid: [],
      },
      severity: ['low'],
    },
  },
  process: {
    name: ['zsh'],
    parent: {
      name: ['mom'],
    },
  },
  source: {
    ip: ['127.0.0.1'],
    port: [1234],
  },
  timestamp: '2022-08-24T12:51:18.427Z',
  user: {
    name: ['root'],
  },
};

describe('alertRenderer', () => {
  describe('isInstance', () => {
    test('it returns true when when `event.kind` is `signal`', () => {
      const isAlert: Ecs = {
        _id: 'abcd',
        event: {
          kind: ['signal'], // <-- this makes it an alert
        },
      };

      expect(alertRenderer.isInstance(isAlert)).toBe(true);
    });

    test('it returns true when when `event.kind` has multiple values, and one of them is (mixed case) `sIgNaL`', () => {
      const alsoAnAlert: Ecs = {
        _id: 'abcd',
        event: {
          kind: ['process', 'sIgNaL'], // <-- also an alert
        },
      };

      expect(alertRenderer.isInstance(alsoAnAlert)).toBe(true);
    });

    test('it returns false when when `event.kind` is NOT `signal`', () => {
      const notAnAlert: Ecs = {
        _id: 'abcd',
        event: {
          kind: ['foozle'], // <-- not an alert
        },
      };

      expect(alertRenderer.isInstance(notAnAlert)).toBe(false);
    });

    test('it returns false when `event.kind` is NOT present', () => {
      const noEventKind: Ecs = {
        _id: 'abcd',
      };

      expect(alertRenderer.isInstance(noEventKind)).toBe(false);
    });
  });

  describe('rendering alert fields', () => {
    const fields = [
      {
        field: EVENT_CATEGORY,
        expected: 'network',
      },
      {
        field: PROCESS_NAME,
        expected: 'process zsh,',
      },
      {
        field: PROCESS_PARENT_NAME,
        expected: 'parent process mom,',
      },
      {
        field: FILE_NAME,
        expected: 'file mimikatz.exe,',
      },
      {
        field: SOURCE_IP,
        expected: 'source 127.0.0.1',
      },
      {
        field: SOURCE_PORT,
        expected: ':1234,',
      },
      {
        field: DESTINATION_IP,
        expected: 'destination 10.0.0.1',
      },
      {
        field: DESTINATION_PORT,
        expected: ':5678,',
      },
      {
        field: USER_NAME,
        expected: 'by root',
      },
      {
        field: HOST_NAME,
        expected: 'on gracious',
      },
      {
        field: KIBANA_ALERT_SEVERITY,
        expected: 'created low alert',
      },
      {
        field: KIBANA_ALERT_RULE_NAME,
        expected: 'panic.',
      },
    ];

    fields.forEach(({ field, expected }) => {
      test(`it renders the expected value (and prefix / suffix when applicable) for the ${field} field`, () => {
        render(
          <TestProviders>
            {alertRenderer.renderRow({
              data: dataWithAllFields,
              scopeId: TimelineId.test,
            })}
          </TestProviders>
        );

        expect(screen.getByTestId(field)).toHaveTextContent(expected);
      });
    });
  });

  test('it (always) renders the "event" static text', () => {
    render(
      <TestProviders>
        {alertRenderer.renderRow({
          data: dataWithAllFields,
          scopeId: TimelineId.test,
        })}
      </TestProviders>
    );

    expect(screen.getByTestId('event')).toHaveTextContent('event');
  });

  describe('with (conditionally rendered static text)', () => {
    test('it renders the static text "with" when `showWith` returns true', () => {
      render(
        <TestProviders>
          {alertRenderer.renderRow({
            data: dataWithAllFields,
            scopeId: TimelineId.test,
          })}
        </TestProviders>
      );

      expect(screen.getByTestId('with')).toHaveTextContent('with');
    });

    test('it doses NOT render the static text "with" when `showWith` returns false', () => {
      render(
        <TestProviders>
          {alertRenderer.renderRow({
            data: omit(WITH_FIELD_NAMES, dataWithAllFields) as Ecs,
            scopeId: TimelineId.test,
          })}
        </TestProviders>
      );

      expect(screen.queryByTestId('with')).not.toBeInTheDocument();
    });
  });

  test('it renders all the expected fields, values, and static text', () => {
    render(
      <TestProviders>
        {alertRenderer.renderRow({
          data: dataWithAllFields,
          scopeId: TimelineId.test,
        })}
      </TestProviders>
    );

    expect(screen.getByTestId('alertRenderer')).toHaveTextContent(
      'network event with process zsh, parent process mom, file mimikatz.exe, source 127.0.0.1:1234, destination 10.0.0.1:5678, by root on gracious created low alert panic.'
    );
  });
});
