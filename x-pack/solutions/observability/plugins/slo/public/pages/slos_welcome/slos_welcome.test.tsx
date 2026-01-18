/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { act, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Router from 'react-router-dom';
import { emptySloDefinitionList, sloDefinitionList } from '../../data/slo/slo';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { render } from '../../utils/test_helper';
import { SlosWelcomePage } from './slos_welcome';

const mockHistoryReplace = jest.fn();
const mockUseHistory = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useHistory: () => mockUseHistory(),
}));

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_fetch_slo_list');
jest.mock('../../hooks/use_fetch_slo_definitions');
jest.mock('../../hooks/use_permissions');

const HeaderMenuPortalMock = HeaderMenuPortal as jest.Mock;
HeaderMenuPortalMock.mockReturnValue(<div>Portal node</div>);

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchSloDefinitionsMock = useFetchSloDefinitions as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;

const mockNavigate = jest.fn();

const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      theme: {},
      http: {
        basePath: {
          prepend: (url: string) => url,
        },
      },
      docLinks: {
        links: {
          query: {},
          observability: {
            slo: 'dummy_link',
          },
        },
      },
      observabilityAIAssistant: mockObservabilityAIAssistant,
    },
  });
};

describe('SLOs Welcome Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryReplace.mockClear();
    mockUseHistory.mockReturnValue({
      replace: mockHistoryReplace,
      createHref: (location: any) => {
        if (typeof location === 'string') return location;
        return location.pathname || '/';
      },
      location: { pathname: '/slos/welcome', search: '', hash: '', state: undefined },
    });
    mockKibana();
    jest
      .spyOn(Router, 'useLocation')
      .mockReturnValue({ pathname: '/slos/welcome', search: '', state: '', hash: '' });
  });

  describe('when the incorrect license is found', () => {
    it('renders the welcome message with subscription buttons', async () => {
      useFetchSloDefinitionsMock.mockReturnValue({
        isLoading: false,
        data: emptySloDefinitionList,
      });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: {
          hasAllWriteRequested: true,
          hasAllReadRequested: true,
        },
      });

      await act(async () => {
        render(<SlosWelcomePage />);
      });

      expect(screen.queryByTestId('sloWelcomePage')).toBeTruthy();
      expect(screen.queryByTestId('sloWelcomePageSignupForCloudButton')).toBeTruthy();
      expect(screen.queryByTestId('sloWelcomePageSignupForLicenseButton')).toBeTruthy();
    });
  });

  describe('when the correct license is found', () => {
    beforeEach(() => {
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: {
          hasAllWriteRequested: true,
          hasAllReadRequested: true,
        },
      });
    });

    describe('when loading is done and no results are found', () => {
      beforeEach(() => {
        useFetchSloDefinitionsMock.mockReturnValue({
          isLoading: false,
          data: emptySloDefinitionList,
        });
      });

      it('disables the create slo button when no write capabilities', async () => {
        usePermissionsMock.mockReturnValue({
          isLoading: false,
          data: {
            hasAllWriteRequested: false,
            hasAllReadRequested: true,
          },
        });

        await act(async () => {
          render(<SlosWelcomePage />);
        });

        expect(screen.queryByTestId('sloWelcomePage')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');

        expect(createNewSloButton).toBeDisabled();
      });

      it('disables the create slo button when no cluster permissions capabilities', async () => {
        usePermissionsMock.mockReturnValue({
          isLoading: false,
          data: {
            hasAllWriteRequested: false,
            hasAllReadRequested: true,
          },
        });

        await act(async () => {
          render(<SlosWelcomePage />);
        });
        expect(screen.queryByTestId('sloWelcomePage')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');
        expect(createNewSloButton).toBeDisabled();
      });

      it('should display the welcome message with a Create new SLO button which should navigate to the SLO Creation page', async () => {
        usePermissionsMock.mockReturnValue({
          isLoading: false,
          data: {
            hasAllWriteRequested: true,
            hasAllReadRequested: true,
          },
        });

        await act(async () => {
          render(<SlosWelcomePage />);
        });
        expect(screen.queryByTestId('sloWelcomePage')).toBeTruthy();

        const createNewSloButton = screen.queryByTestId('o11ySloListWelcomePromptCreateSloButton');
        expect(createNewSloButton).toBeTruthy();

        await act(async () => {
          createNewSloButton?.click();
        });

        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(paths.sloCreate);
        });
      });
    });

    describe('when loading is done and results are found', () => {
      beforeEach(() => {
        useFetchSloDefinitionsMock.mockReturnValue({ isLoading: false, data: sloDefinitionList });
        usePermissionsMock.mockReturnValue({
          isLoading: false,
          data: {
            hasAllWriteRequested: true,
            hasAllReadRequested: true,
          },
        });
      });

      it('should navigate to the SLO List page', async () => {
        await act(async () => {
          render(<SlosWelcomePage />);
        });
        await waitFor(() => {
          expect(mockHistoryReplace).toHaveBeenCalledWith('/');
        });
      });
    });
  });
});
