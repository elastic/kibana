/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { waitFor, within } from '@testing-library/react';
// eslint-disable-next-line import/no-extraneous-dependencies
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ArtifactFormComponentProps } from './types';
import type { ArtifactListPageProps } from './artifact_list_page';
import { ArtifactListPage } from './artifact_list_page';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { trustedAppsAllHttpMocks } from '../../mocks';
import { TrustedAppsApiClient } from '../../pages/trusted_apps/service/api_client';
import { artifactListPageLabels } from './translations';

export const getFormComponentMock = (): {
  FormComponentMock: jest.Mock<React.FunctionComponent<ArtifactFormComponentProps>>;
  /**
   * Returns the props object that the Form component was last called with
   */
  getLastFormComponentProps: () => ArtifactFormComponentProps;
} => {
  const FormComponentMock = jest.fn((({ mode, error, disabled }: ArtifactFormComponentProps) => {
    return (
      <div data-test-subj="formMock">
        <div>{`${mode} form`}</div>
        <div>{`Is Disabled: ${disabled}`}</div>
        {error && (
          <>
            <div data-test-subj="formError">{error.message}</div>
            <div>{JSON.stringify(error.body)}</div>
          </>
        )}
      </div>
    );
  }) as unknown as jest.Mock<React.FunctionComponent<ArtifactFormComponentProps>>);

  const getLastFormComponentProps = (): ArtifactFormComponentProps => {
    return FormComponentMock.mock.calls[FormComponentMock.mock.calls.length - 1][0];
  };

  return {
    FormComponentMock,
    getLastFormComponentProps,
  };
};

export const getFirstCard = async (
  user: UserEvent,
  renderResult: ReturnType<AppContextTestRender['render']>,
  {
    showActions = false,
    testId = 'testPage',
  }: Partial<{ showActions: boolean; testId: string }> = {}
): Promise<HTMLElement> => {
  const cards = await renderResult.findAllByTestId(`${testId}-card`);

  if (cards.length === 0) {
    throw new Error('No cards found!');
  }

  const card = cards[0];

  if (showActions) {
    await user.click(within(card).getByTestId(`${testId}-card-header-actions-button`));

    await waitFor(() => {
      expect(
        renderResult.getByTestId(`${testId}-card-header-actions-contextMenuPanel`)
      ).toBeInTheDocument();
    });
  }

  return card;
};

export interface ArtifactListPageRenderingSetup {
  user: UserEvent;
  renderArtifactListPage: (
    props?: Partial<ArtifactListPageProps>
  ) => ReturnType<AppContextTestRender['render']>;
  history: AppContextTestRender['history'];
  coreStart: AppContextTestRender['coreStart'];
  mockedApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  FormComponentMock: ReturnType<typeof getFormComponentMock>['FormComponentMock'];
  getLastFormComponentProps: ReturnType<typeof getFormComponentMock>['getLastFormComponentProps'];
  getFirstCard(props?: Partial<{ showActions: boolean }>): Promise<HTMLElement>;
}

/**
 * Returns the setup needed to render the ArtifactListPage for unit tests
 */
export const getArtifactListPageRenderingSetup = (): ArtifactListPageRenderingSetup => {
  // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });

  const mockedContext = createAppRootMockRenderer();

  const { history, coreStart } = mockedContext;
  const mockedApi = trustedAppsAllHttpMocks(coreStart.http);

  const apiClient = new TrustedAppsApiClient(coreStart.http);
  const labels = { ...artifactListPageLabels };

  const { FormComponentMock, getLastFormComponentProps } = getFormComponentMock();

  let renderResult: ReturnType<AppContextTestRender['render']>;

  const renderArtifactListPage = (props: Partial<ArtifactListPageProps> = {}) => {
    renderResult = mockedContext.render(
      <ArtifactListPage
        apiClient={apiClient}
        ArtifactFormComponent={
          FormComponentMock as unknown as ArtifactListPageProps['ArtifactFormComponent']
        }
        labels={labels}
        data-test-subj="testPage"
        {...props}
      />
    );

    return renderResult;
  };

  const getCard: ArtifactListPageRenderingSetup['getFirstCard'] = (props) => {
    return getFirstCard(user, renderResult, props);
  };

  return {
    user,
    renderArtifactListPage,
    history,
    coreStart,
    mockedApi,
    FormComponentMock,
    getLastFormComponentProps,
    getFirstCard: getCard,
  };
};
