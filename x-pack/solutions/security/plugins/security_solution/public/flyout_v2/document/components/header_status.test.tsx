/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { HeaderStatus } from './header_status';
import { STATUS_TITLE_TEST_ID } from '../../shared/components/test_ids';

jest.mock('./status_popover_button', () => ({
  StatusPopoverButton: ({
    eventId,
    contextId,
    onStatusUpdated,
  }: {
    eventId: string;
    contextId: string;
    onStatusUpdated?: () => void;
  }) => (
    <button
      data-test-subj="mockStatusPopoverButton"
      data-event-id={eventId}
      data-context-id={contextId}
      onClick={onStatusUpdated}
      type="button"
    />
  ),
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: 'alert-1',
    raw: { _id: 'es-alert-1' },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'kibana.alert.workflow_status': 'open',
});

const renderComponent = (props: Partial<Parameters<typeof HeaderStatus>[0]> = {}) =>
  render(
    <IntlProvider locale="en">
      <HeaderStatus hit={alertHit} {...props} />
    </IntlProvider>
  );

describe('<HeaderStatus />', () => {
  it('renders the interactive status button by default', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(STATUS_TITLE_TEST_ID)).toHaveTextContent('Status');
    expect(getByTestId('mockStatusPopoverButton')).toHaveAttribute('data-event-id', 'es-alert-1');
    expect(getByTestId('mockStatusPopoverButton')).toHaveAttribute('data-context-id', '');
  });

  it('wraps the status button with the provided cell action renderer', () => {
    const renderCellActions = jest.fn(({ children, field, value, scopeId }) => (
      <div
        data-test-subj="wrappedCellActions"
        data-field={field}
        data-value={value}
        data-scope-id={scopeId}
      >
        {children}
      </div>
    ));

    const { getByTestId } = renderComponent({ renderCellActions });

    expect(renderCellActions).toHaveBeenCalledTimes(1);
    expect(getByTestId('wrappedCellActions')).toHaveAttribute(
      'data-field',
      'kibana.alert.workflow_status'
    );
    expect(getByTestId('wrappedCellActions')).toHaveAttribute('data-value', 'open');
    expect(getByTestId('wrappedCellActions')).toHaveAttribute('data-scope-id', '');
  });

  it('calls the alert update callback after a status change', () => {
    const onAlertUpdated = jest.fn();
    const { getByTestId } = renderComponent({ onAlertUpdated });

    getByTestId('mockStatusPopoverButton').click();

    expect(onAlertUpdated).toHaveBeenCalledTimes(1);
  });

  it('renders an empty value when the alert has no workflow status', () => {
    const { container, queryByTestId } = renderComponent({
      hit: createMockHit({}),
    });

    expect(queryByTestId('mockStatusPopoverButton')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Status—');
  });
});
