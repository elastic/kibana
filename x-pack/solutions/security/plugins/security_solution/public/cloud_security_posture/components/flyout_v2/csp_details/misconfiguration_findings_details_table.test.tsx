/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';
import { EntityIdentifierFields } from '../../../../../common/entity_analytics/types';

jest.mock('../../csp_details/misconfiguration_findings_details_table', () => ({
  MisconfigurationFindingsDetailsTable: jest.fn(() => (
    <div data-test-subj="base-misconfiguration-table" />
  )),
}));

import { MisconfigurationFindingsDetailsTable as MisconfigurationFindingsDetailsTableBase } from '../../csp_details/misconfiguration_findings_details_table';

describe('MisconfigurationFindingsDetailsTable (flyout v2 wrapper)', () => {
  const onShowFinding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 table and forwards props including onShowFinding', () => {
    const { getByTestId } = render(
      <MisconfigurationFindingsDetailsTable
        field={EntityIdentifierFields.hostName}
        value="my-host"
        scopeId="scope-id"
        entityId="host-entity-id"
        entityType="host"
        onShowFinding={onShowFinding}
      />
    );

    expect(getByTestId('base-misconfiguration-table')).toBeInTheDocument();

    const props = (MisconfigurationFindingsDetailsTableBase as unknown as jest.Mock).mock
      .calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        field: EntityIdentifierFields.hostName,
        value: 'my-host',
        scopeId: 'scope-id',
        entityId: 'host-entity-id',
        entityType: 'host',
        onShowFinding,
      })
    );
  });
});
