/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { DocumentDetailsContext } from '../../../flyout/document_details/shared/context';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { TableFieldValueCell } from './table_field_value_cell';
import { TestProviders } from '../../../common/mock';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import type { OpenFlyoutLinkRenderer } from './open_flyout_link';

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: () => ({
      ...actual.useKibana(),
      services: {
        ...actual.useKibana().services,
        telemetry: mockedTelemetry,
      },
    }),
    useUiSetting: jest.fn().mockReturnValue(false),
  };
});

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  scopeId: 'scopeId',
} as unknown as DocumentDetailsContext;

const scopeId = 'scopeId';

const eventId = 'TUWyf3wBFCFU0qRJTauW';

const hostIpData: EventFieldsData = {
  aggregatable: true,
  ariaRowindex: 35,
  field: 'host.ip',
  isObjectArray: false,
  name: 'host.ip',
  originalValue: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
  readFromDocValues: false,
  searchable: true,
  type: 'ip',
  values: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
};
const hostIpValues = ['127.0.0.1', '::1', '10.1.2.3', 'fe80::4001:aff:fec8:32'];

describe('TableFieldValueCell', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  describe('common behavior', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <TableFieldValueCell
              scopeId={scopeId}
              data={hostIpData}
              eventId={eventId}
              values={hostIpValues}
              ruleId="ruleId"
            />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );
    });

    it('should format multiple values such that each value is displayed on a single line', () => {
      expect(screen.getByTestId(`event-field-${hostIpData.field}`).className).toContain('column');
    });
  });

  describe('when `BrowserField` metadata is NOT available', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <TableFieldValueCell
              scopeId={scopeId}
              data={hostIpData}
              eventId={eventId}
              fieldFromBrowserField={undefined} // <-- no metadata
              values={hostIpValues}
              ruleId="ruleId"
            />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );
    });

    it('should render each of the expected values when `fieldFromBrowserField` is undefined', () => {
      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });

  describe('`message` field formatting', () => {
    const messageData: EventFieldsData = {
      aggregatable: false,
      ariaRowindex: 50,
      field: 'message',
      isObjectArray: false,
      name: 'message',
      originalValue: ['Endpoint network event'],
      readFromDocValues: false,
      searchable: true,
      type: 'string',
      values: ['Endpoint network event'],
    };
    const messageValues = ['Endpoint network event'];

    const messageFieldFromBrowserField: FieldSpec = {
      aggregatable: false,
      name: 'message',
      readFromDocValues: false,
      searchable: true,
      type: 'string',
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <TableFieldValueCell
              scopeId={scopeId}
              data={messageData}
              eventId={eventId}
              fieldFromBrowserField={messageFieldFromBrowserField}
              values={messageValues}
              ruleId="ruleId"
            />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );
    });

    it('should render special formatting for the `message` field', () => {
      expect(screen.getByTestId('event-field-message')).toBeInTheDocument();
    });

    it('should render the expected message value', () => {
      messageValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });

  describe('when `FieldSpec` metadata IS available', () => {
    const hostIpFieldFromBrowserField: FieldSpec = {
      aggregatable: true,
      name: 'host.ip',
      readFromDocValues: false,
      searchable: true,
      type: 'ip',
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <TableFieldValueCell
              scopeId={scopeId}
              data={hostIpData}
              eventId={eventId}
              fieldFromBrowserField={hostIpFieldFromBrowserField} // <-- metadata
              values={hostIpValues}
              ruleId="ruleId"
            />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );
    });

    it('should align items at the start of the group to prevent content from stretching (by default)', () => {
      expect(screen.getByTestId(`event-field-${hostIpData.field}`).className).toContain(
        'flexStart'
      );
    });

    it('should render each of the expected values when `fieldFromBrowserField` is provided', () => {
      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });

  describe('when `renderFlyoutLink` is provided (new flyout)', () => {
    // Stub renderer standing in for `OpenFlyoutLink`: wraps each value in an identifiable element.
    const renderFlyoutLink: OpenFlyoutLinkRenderer = ({ field, children }) => (
      <span data-test-subj={`flyout-link-${field}`}>{children}</span>
    );

    const hostIpFieldFromBrowserField: FieldSpec = {
      aggregatable: true,
      name: 'host.ip',
      readFromDocValues: false,
      searchable: true,
      type: 'ip',
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <DocumentDetailsContext.Provider value={panelContextValue}>
            <TableFieldValueCell
              scopeId={scopeId}
              data={hostIpData}
              eventId={eventId}
              fieldFromBrowserField={hostIpFieldFromBrowserField}
              values={hostIpValues}
              ruleId="ruleId"
              renderFlyoutLink={renderFlyoutLink}
            />
          </DocumentDetailsContext.Provider>
        </TestProviders>
      );
    });

    it('wraps each value with the injected flyout link renderer', () => {
      expect(screen.getAllByTestId('flyout-link-host.ip').length).toBe(hostIpValues.length);
    });
  });
});
