/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, waitFor } from '@testing-library/react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import type { WorkflowMigrationStats } from '../../types';
import { raiseSuccessToast } from './success_notification';

const mockNavigateTo = jest.fn();
jest.mock('@kbn/security-solution-navigation', () => ({
  ...jest.requireActual('@kbn/security-solution-navigation'),
  useNavigation: () => ({
    navigateTo: mockNavigateTo,
    getAppUrl: jest.fn(() => '/app/security/siem_migrations-workflows/migration-1'),
  }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const migrationStats = {
  id: 'migration-1',
  name: 'My Tines migration',
  status: SiemMigrationTaskStatus.FINISHED,
  items: { total: 3, pending: 0, processing: 0, completed: 3, failed: 0 },
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
} as WorkflowMigrationStats;

const renderToast = () => {
  const core = coreMock.createStart();
  core.notifications.toasts.addSuccess.mockReturnValue({ id: 'toast-1' } as never);
  raiseSuccessToast(migrationStats, core as unknown as CoreStart);
  const toast = core.notifications.toasts.addSuccess.mock.calls[0][0] as {
    title: string;
    text: unknown;
  };
  return { core, toast };
};

describe('raiseSuccessToast (workflows)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should announce that the workflows translation is complete', () => {
    const { toast } = renderToast();

    expect(toast.title).toBe('Workflows translation complete.');
  });

  it('should lead to the translated workflows page of the migration', async () => {
    const { toast } = renderToast();
    const container = document.createElement('div');
    document.body.appendChild(container);
    (toast.text as unknown as (el: HTMLElement) => void)(container);

    await waitFor(() => expect(container.querySelector('a, button')).not.toBeNull());
    const link = container.querySelector('a, button') as HTMLElement;
    expect(link).toHaveTextContent('Go to translated workflows');
    fireEvent.click(link);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: 'siem_migrations-workflows',
      path: 'migration-1',
    });
  });
});
