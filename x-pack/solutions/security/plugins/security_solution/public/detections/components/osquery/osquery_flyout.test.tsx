/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { OsqueryFlyout } from './osquery_flyout';
import { useKibana } from '../../../common/lib/kibana';
import { useAddToTimeline } from '../../../common/hooks/use_add_to_timeline';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFlyout: ({
      children,
      session,
      size,
    }: {
      children: React.ReactNode;
      session?: string;
      size?: string;
    }) => (
      <div data-test-subj="osquery-flyout" data-session={session} data-size={size}>
        {children}
      </div>
    ),
  };
});

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_add_to_timeline');
jest.mock('./osquery_flyout_footer', () => ({
  OsqueryEventDetailsFooter: () => <div data-test-subj="osquery-footer" />,
}));

describe('OsqueryFlyout', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        osquery: {
          OsqueryAction: () => <div data-test-subj="osquery-action" />,
        },
      },
    });
    (useAddToTimeline as jest.Mock).mockReturnValue(jest.fn());
  });

  it('renders the flyout opted out of the managed flyout session to avoid size conflicts', () => {
    render(<OsqueryFlyout onClose={jest.fn()} />);

    const flyout = screen.getByTestId('osquery-flyout');
    // `session="never"` prevents the INVALID_SIZE_COMBINATION crash when opened from inside a
    // managed size "m" flyout (e.g. the flyout v2 investigation guide).
    expect(flyout).toHaveAttribute('data-session', 'never');
    expect(flyout).toHaveAttribute('data-size', 'm');
  });
});
