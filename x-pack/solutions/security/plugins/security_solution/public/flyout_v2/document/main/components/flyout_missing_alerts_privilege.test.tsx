/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID } from './test_ids';
import { FlyoutMissingAlertsPrivilege } from './flyout_missing_alerts_privilege';

const mockNoPrivileges = jest.fn(
  ({ pageName, docLinkSelector, ...rest }: Record<string, unknown>) => (
    <div data-test-subj={rest['data-test-subj']}>
      <span data-page-name={pageName} />
      <span data-doc-link-selector={typeof docLinkSelector} />
    </div>
  )
);

jest.mock('../../../../common/components/no_privileges', () => ({
  NoPrivileges: (props: Record<string, unknown>) => mockNoPrivileges(props),
}));

describe('<FlyoutMissingAlertsPrivilege />', () => {
  it('renders with the correct test id', () => {
    const { getByTestId } = render(<FlyoutMissingAlertsPrivilege />);
    expect(getByTestId(FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID)).toBeInTheDocument();
  });

  it('passes the expected pageName and docLinkSelector to NoPrivileges', () => {
    const { getByTestId } = render(<FlyoutMissingAlertsPrivilege />);
    expect(getByTestId(FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID)).toBeInTheDocument();
    expect(mockNoPrivileges).toHaveBeenCalledWith(
      expect.objectContaining({
        pageName: 'Alert details',
        'data-test-subj': FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID,
      })
    );
    const call = mockNoPrivileges.mock.calls[0][0] as {
      docLinkSelector: (links: { siem: { detectionsReq: string } }) => string;
    };
    expect(call.docLinkSelector).toBeDefined();
    expect(typeof call.docLinkSelector).toBe('function');
    expect(
      call.docLinkSelector({ siem: { detectionsReq: 'https://example.com/detections' } })
    ).toBe('https://example.com/detections');
  });
});
