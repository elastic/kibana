/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';

import { OsqueryFlyout } from './osquery_flyout';
import { useKibana } from '../../../common/lib/kibana';
import { useAddToTimeline } from '../../../common/hooks/use_add_to_timeline';

vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
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

vi.mock('@kbn/react-query', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/react-query')),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/lib/kibana');
vi.mock('../../../common/hooks/use_add_to_timeline');
vi.mock('./osquery_flyout_footer', () => {
  const mocked = {
    OsqueryEventDetailsFooter: () => <div data-test-subj="osquery-footer" />,
  };
  return { ...mocked, default: mocked };
});

describe('OsqueryFlyout', () => {
  beforeEach(() => {
    (useKibana as Mock).mockReturnValue({
      services: {
        osquery: {
          OsqueryAction: () => <div data-test-subj="osquery-action" />,
        },
      },
    });
    (useAddToTimeline as Mock).mockReturnValue(vi.fn());
  });

  it('renders the flyout opted out of the managed flyout session to avoid size conflicts', () => {
    render(<OsqueryFlyout onClose={vi.fn()} />);

    const flyout = screen.getByTestId('osquery-flyout');
    // `session="never"` prevents the INVALID_SIZE_COMBINATION crash when opened from inside a
    // managed size "m" flyout (e.g. the flyout v2 investigation guide).
    expect(flyout).toHaveAttribute('data-session', 'never');
    expect(flyout).toHaveAttribute('data-size', 'm');
  });
});
