/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { applicationServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { ApplicationStart } from '@kbn/core/public';
import { getSolutionNavFooter } from './solution_navigation_footer';

describe('SolutionNavigationFooter', () => {
  describe('getSolutionNavFooter', () => {
    const MockSolutionViewSwitchCallout = () => <div data-test-subj="solutionViewSwitchCallout" />;
    const mockNotifications = notificationServiceMock.createStartContract();
    const mockApplication: ApplicationStart = applicationServiceMock.createStartContract();
    const mockSpaces = spacesPluginMock.createStartContract();

    beforeEach(() => {
      jest.clearAllMocks();
      mockNotifications.tours.isEnabled.mockReturnValue(true);
      mockApplication.capabilities = {
        ...mockApplication.capabilities,
        spaces: { manage: true },
      };
      mockSpaces.ui.components.getSolutionViewSwitchCallout = MockSolutionViewSwitchCallout;
    });

    it('returns a React element when all conditions are met', () => {
      const footer = getSolutionNavFooter({
        application: mockApplication,
        notifications: mockNotifications,
        spaces: mockSpaces,
      });
      expect(React.isValidElement(footer)).toBe(true);
    });

    it('returns undefined when announcements are disabled', () => {
      mockNotifications.tours.isEnabled.mockReturnValue(false);
      const footer = getSolutionNavFooter({
        application: mockApplication,
        notifications: mockNotifications,
        spaces: mockSpaces,
      });
      expect(footer).toBeUndefined();
    });

    it('returns undefined when canManageSpaces is false', () => {
      mockApplication.capabilities = {
        ...mockApplication.capabilities,
        spaces: { manage: false },
      };
      const footer = getSolutionNavFooter({
        application: mockApplication,
        notifications: mockNotifications,
        spaces: mockSpaces,
      });
      expect(footer).toBeUndefined();
    });

    it('returns undefined when spaces plugin is not available', () => {
      const footer = getSolutionNavFooter({
        application: mockApplication,
        notifications: mockNotifications,
      });
      expect(footer).toBeUndefined();
    });
  });
});
