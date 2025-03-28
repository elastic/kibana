import { renderHook } from '@testing-library/react-hooks';
import { useIndicesRedirect } from './use_indices_redirect';
import { useKibana } from '../../../hooks/use_kibana';
import type { UserStartPrivilegesResponse } from '../../../../common';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../contexts/usage_tracker_context', () => ({
  useUsageTracker: jest.fn(() => ({
    click: jest.fn(),
  })),
}));

describe('useIndicesRedirect', () => {
  const mockNavigateToApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
        http: {},
      },
    });
  });

  it('should navigate to "discover" if user does not have manage index privileges', () => {
    const userPrivileges = {
      privileges: {
        canManageIndex: false,
      },
    } as UserStartPrivilegesResponse;

    renderHook(() => useIndicesRedirect(undefined, userPrivileges));

    expect(mockNavigateToApp).toHaveBeenCalledWith('discover');
  });

  it('should navigate to "elasticsearchIndexManagement" if indicesStatus has more than one index', () => {
    const indicesStatus = {
      indexNames: ['index1', 'index2'],
    };

    const userPrivileges = {
      privileges: {
        canManageIndex: true,
      },
    } as UserStartPrivilegesResponse;

    renderHook(() => useIndicesRedirect(indicesStatus, userPrivileges));

    expect(mockNavigateToApp).toHaveBeenCalledWith('elasticsearchIndexManagement');
  });
});
