/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertsDetailsTable } from './alerts_findings_details_table';
import { EntityIdentifierFields } from '../../../../../common/entity_analytics/types';

jest.mock('../../csp_details/alerts_findings_details_table', () => ({
  AlertsDetailsTable: jest.fn(() => <div data-test-subj="base-alerts-table" />),
}));

import { AlertsDetailsTable as AlertsDetailsTableBase } from '../../csp_details/alerts_findings_details_table';

describe('AlertsDetailsTable (flyout v2 wrapper)', () => {
  const onShowAlert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 table and forwards props including onShowAlert', () => {
    const { getByTestId } = render(
      <AlertsDetailsTable
        field={EntityIdentifierFields.hostName}
        value="my-host"
        entityId="host-entity-id"
        entityType="host"
        onShowAlert={onShowAlert}
      />
    );

    expect(getByTestId('base-alerts-table')).toBeInTheDocument();

    const props = (AlertsDetailsTableBase as unknown as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        field: EntityIdentifierFields.hostName,
        value: 'my-host',
        entityId: 'host-entity-id',
        entityType: 'host',
        onShowAlert,
      })
    );
  });
});
