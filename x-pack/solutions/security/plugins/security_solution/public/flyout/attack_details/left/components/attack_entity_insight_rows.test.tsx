/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AttackHostInsightsRow, AttackUserInsightsRow } from './attack_entity_insight_rows';
import { EuiProvider } from '@elastic/eui';

jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useUiSetting: () => false,
  };
});

jest.mock('../../../entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: () => ({
    entityRecord: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../document_details/left/components/host_details', () => ({
  HostDetails: (props: { hostName: string }) => (
    <div data-test-subj="host-details-mock" data-host-name={props.hostName}>
      {props.hostName}
    </div>
  ),
}));

jest.mock('../../../document_details/left/components/user_details', () => ({
  UserDetails: (props: { userName: string }) => (
    <div data-test-subj="user-details-mock" data-user-name={props.userName}>
      {props.userName}
    </div>
  ),
}));

describe('AttackHostInsightsRow', () => {
  it('uses host.name from sample _source when EUID map only exposed entity id', () => {
    const identityFields = {
      'entity.id': '7eb51035-5582-4cb8-9db2-5e71ef09aa5b',
      'entity.namespace': 'local',
    };
    const sampleSource = {
      host: { name: 'Host-dbzugdlqdn', id: '7eb51035-5582-4cb8-9db2-5e71ef09aa5b' },
    };

    render(
      <EuiProvider>
        <AttackHostInsightsRow
          identityFields={identityFields}
          sampleSource={sampleSource}
          timestamp="2025-06-01T00:00:00Z"
          scopeId="attacks-page"
        />
      </EuiProvider>
    );

    expect(screen.getByTestId('host-details-mock')).toHaveAttribute(
      'data-host-name',
      'Host-dbzugdlqdn'
    );
  });
});

describe('AttackUserInsightsRow', () => {
  it('passes resolved user.name to UserDetails', () => {
    const identityFields = {
      'user.name': 'alice',
    };
    const sampleSource = {
      user: { name: 'alice' },
    };

    render(
      <EuiProvider>
        <AttackUserInsightsRow
          identityFields={identityFields}
          sampleSource={sampleSource}
          timestamp="2025-06-01T00:00:00Z"
          scopeId="attacks-page"
        />
      </EuiProvider>
    );

    expect(screen.getByTestId('user-details-mock')).toHaveAttribute('data-user-name', 'alice');
  });
});
