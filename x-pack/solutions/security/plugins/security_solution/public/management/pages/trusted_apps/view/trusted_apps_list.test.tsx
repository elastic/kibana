/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import React from 'react';
import { TRUSTED_APPS_PATH } from '../../../../../common/constants';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { TrustedAppsList } from './trusted_apps_list';
import { exceptionsListAllHttpMocks } from '../../../mocks/exceptions_list_http_mocks';
import { SEARCHABLE_FIELDS } from '../constants';
import { parseQueryFilterToKQL } from '../../../common/utils';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type { EndpointPrivileges } from '../../../../../common/endpoint/types';
import { ExceptionsListItemGenerator } from '../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { TRUSTED_PROCESS_DESCENDANTS_TAG } from '../../../../../common/endpoint/service/artifacts';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../../common';

jest.mock('../../../../common/experimental_features_service');
jest.mock('../../../../common/components/user_privileges');
const mockUserPrivileges = useUserPrivileges as jest.Mock;

describe('When on the trusted applications page', () => {
  let user: UserEvent;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof exceptionsListAllHttpMocks>;
  let mockedEndpointPrivileges: Partial<EndpointPrivileges>;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();
    // enable process descendants feature flag
    (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
      ...allowedExperimentalValues,
      filterProcessDescendantsForTrustedAppsEnabled: true,
    });
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<TrustedAppsList />));

    apiMocks = exceptionsListAllHttpMocks(mockedContext.coreStart.http);

    act(() => {
      history.push(TRUSTED_APPS_PATH);
    });

    mockedEndpointPrivileges = {
      canManageGlobalArtifacts: true,
      canWriteTrustedApplications: true,
    };
    mockUserPrivileges.mockReturnValue({ endpointPrivileges: mockedEndpointPrivileges });
  });

  afterEach(() => {
    mockUserPrivileges.mockReset();
  });

  it('should search using expected exception item fields', async () => {
    const expectedFilterString = parseQueryFilterToKQL('fooFooFoo', SEARCHABLE_FIELDS);
    const { getAllByTestId } = render();

    await waitFor(async () => {
      expect(getAllByTestId('trustedAppsListPage-card')).toHaveLength(10);
    });

    apiMocks.responseProvider.exceptionsFind.mockClear();
    await user.click(renderResult.getByTestId('searchField'));
    await user.paste('fooFooFoo');
    await user.click(renderResult.getByTestId('searchButton'));
    await waitFor(() => {
      expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenCalled();
    });

    expect(apiMocks.responseProvider.exceptionsFind).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          filter: expectedFilterString,
        }),
      })
    );
  });

  describe('process descendants', () => {
    let renderWithData: () => Promise<ReturnType<AppContextTestRender['render']>>;

    beforeEach(() => {
      renderWithData = async () => {
        const generator = new ExceptionsListItemGenerator();

        apiMocks.responseProvider.exceptionsFind.mockReturnValue({
          data: [
            generator.generateTrustedApp(),
            generator.generateTrustedApp({ tags: [TRUSTED_PROCESS_DESCENDANTS_TAG] }),
            generator.generateTrustedApp({ tags: [TRUSTED_PROCESS_DESCENDANTS_TAG] }),
          ],
          total: 3,
          per_page: 3,
          page: 1,
        });

        render();

        await waitFor(() => {
          expect(renderResult.getByTestId('trustedAppsListPage-list')).toBeTruthy();
        });

        return renderResult;
      };
    });

    it('should indicate to user if trusted app has process descendants', async () => {
      await renderWithData();

      expect(renderResult.getAllByTestId('trustedAppsListPage-card')).toHaveLength(3);
      expect(
        renderResult.getAllByTestId(
          'trustedAppsListPage-card-decorator-processDescendantsIndication'
        )
      ).toHaveLength(2);
    });

    it('should display additional `event.category is process` entry in tooltip', async () => {
      const prefix = 'trustedAppsListPage-card-decorator-processDescendantsIndicationTooltip';

      await renderWithData();

      expect(renderResult.getAllByTestId(`${prefix}-tooltipIcon`)).toHaveLength(2);
      expect(renderResult.queryByTestId(`${prefix}-tooltipText`)).not.toBeInTheDocument();

      userEvent.hover(renderResult.getAllByTestId(`${prefix}-tooltipIcon`)[0]);

      await waitFor(async () => {
        expect(renderResult.queryByTestId(`${prefix}-tooltipText`)).toBeInTheDocument();
        expect(renderResult.queryByTestId(`${prefix}-tooltipText`)?.textContent).toContain(
          'event.category is process'
        );
      });
    });
  });

  describe('RBAC Trusted Applications', () => {
    describe('ALL privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteTrustedApplications = true;
      });

      it('should enable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('trustedAppsListPage-pageAddButton')).toBeTruthy()
        );
      });

      it('should enable modifying/deleting entries', async () => {
        render();

        const actionsButton = await waitFor(
          () => renderResult.getAllByTestId('trustedAppsListPage-card-header-actions-button')[0]
        );
        await user.click(actionsButton);

        expect(renderResult.getByTestId('trustedAppsListPage-card-cardEditAction')).toBeTruthy();
        expect(renderResult.getByTestId('trustedAppsListPage-card-cardDeleteAction')).toBeTruthy();
      });
    });

    describe('READ privilege', () => {
      beforeEach(() => {
        mockedEndpointPrivileges.canWriteTrustedApplications = false;
      });

      it('should disable adding entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('trustedAppsListPage-container')).toBeTruthy()
        );

        expect(renderResult.queryByTestId('trustedAppsListPage-pageAddButton')).toBeNull();
      });

      it('should disable modifying/deleting entries', async () => {
        render();

        await waitFor(() =>
          expect(renderResult.queryByTestId('trustedAppsListPage-container')).toBeTruthy()
        );

        expect(
          renderResult.queryByTestId('trustedAppsListPage-card-header-actions-button')
        ).toBeNull();
      });
    });
  });
});
