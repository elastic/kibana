/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../../../../common/mock';
import { mockEndgameDnsRequest } from '../../../../../../common/mock/mock_endgame_ecs_data';

import { DnsRequestEventDetails } from './dns_request_event_details';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('DnsRequestEventDetails', () => {
  test('it renders the expected text given an Endgame DNS request_event', () => {
    const { container } = render(
      <TestProviders>
        <DnsRequestEventDetails
          contextId="test-context"
          data={mockEndgameDnsRequest}
          timelineId="timeline-id-test"
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual(
      'SYSTEM\\NT AUTHORITY@HD-obe-8bf77f54asked forupdate.googleapis.comwith question typeA, which resolved to10.100.197.67viaGoogleUpdate.exe(443192)3008dns'
    );
  });
});
