/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { VulnerabilitiesFindingsDetailsTable } from './vulnerabilities_findings_details_table';
import { EntityIdentifierFields } from '../../../../../common/entity_analytics/types';

jest.mock('../../csp_details/vulnerabilities_findings_details_table', () => ({
  VulnerabilitiesFindingsDetailsTable: jest.fn(() => (
    <div data-test-subj="base-vulnerabilities-table" />
  )),
}));

import { VulnerabilitiesFindingsDetailsTable as VulnerabilitiesFindingsDetailsTableBase } from '../../csp_details/vulnerabilities_findings_details_table';

describe('VulnerabilitiesFindingsDetailsTable (flyout v2 wrapper)', () => {
  const onShowVulnerability = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 table and forwards props including onShowVulnerability', () => {
    const { getByTestId } = render(
      <VulnerabilitiesFindingsDetailsTable
        identityField={EntityIdentifierFields.hostName}
        value="my-host"
        scopeId="scope-id"
        entityId="host-entity-id"
        entityType="host"
        onShowVulnerability={onShowVulnerability}
      />
    );

    expect(getByTestId('base-vulnerabilities-table')).toBeInTheDocument();

    const props = (VulnerabilitiesFindingsDetailsTableBase as unknown as jest.Mock).mock
      .calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        identityField: EntityIdentifierFields.hostName,
        value: 'my-host',
        scopeId: 'scope-id',
        entityId: 'host-entity-id',
        entityType: 'host',
        onShowVulnerability,
      })
    );
  });
});
