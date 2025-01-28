/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoDataPage, NoDataPageProps } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { SubscriptionNotAllowed } from '../subscription_not_allowed';
import { useSubscriptionStatus } from '../../common/hooks/use_subscription_status';
import { FullSizeCenteredPage } from '../full_size_page';
import { useCloudDefendSetupStatusApi } from '../../common/api/use_setup_status_api';
import { LoadingState } from '../loading_state';
import { useCloudDefendIntegrationLinks } from '../../common/navigation/use_cloud_defend_integration_links';

import noDataIllustration from '../../assets/icons/logo.svg';

export const LOADING_STATE_TEST_SUBJECT = 'cloud_defend_page_loading';
export const ERROR_STATE_TEST_SUBJECT = 'cloud_defend_page_error';
export const PACKAGE_NOT_INSTALLED_TEST_SUBJECT = 'cloud_defend_page_package_not_installed';
export const DEFAULT_NO_DATA_TEST_SUBJECT = 'cloud_defend_page_no_data';
export const SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT = 'cloud_defend_page_subscription_not_allowed';

interface CommonError {
  body: {
    error: string;
    message: string;
    statusCode: number;
  };
}

export const isCommonError = (error: unknown): error is CommonError => {
  if (
    !(error as any)?.body ||
    !(error as any)?.body?.error ||
    !(error as any)?.body?.message ||
    !(error as any)?.body?.statusCode
  ) {
    return false;
  }

  return true;
};

export interface CloudDefendNoDataPageProps {
  pageTitle: NoDataPageProps['pageTitle'];
  docsLink: NoDataPageProps['docsLink'];
  actionHref: NoDataPageProps['actions']['elasticAgent']['href'];
  actionTitle: NoDataPageProps['actions']['elasticAgent']['title'];
  actionDescription: NoDataPageProps['actions']['elasticAgent']['description'];
  testId: string;
}

export const CloudDefendNoDataPage = ({
  pageTitle,
  docsLink,
  actionHref,
  actionTitle,
  actionDescription,
  testId,
}: CloudDefendNoDataPageProps) => {
  return (
    <NoDataPage
      data-test-subj={testId}
      css={css`
        > :nth-child(3) {
          display: block;
          margin: auto;
          width: 450px;
        }
      `}
      pageTitle={pageTitle}
      solution={i18n.translate(
        'xpack.cloudDefend.cloudDefendPage.packageNotInstalled.solutionNameLabel',
        {
          defaultMessage: 'Defend for containers (D4C)',
        }
      )}
      docsLink={docsLink}
      logo="logoSecurity"
      actions={{
        elasticAgent: {
          href: actionHref,
          isDisabled: !actionHref,
          title: actionTitle,
          description: actionDescription,
        },
      }}
    />
  );
};

const packageNotInstalledRenderer = ({
  addIntegrationLink,
  docsLink,
}: {
  addIntegrationLink?: string;
  docsLink?: string;
}) => {
  return (
    <FullSizeCenteredPage>
      <EuiEmptyPrompt
        data-test-subj={PACKAGE_NOT_INSTALLED_TEST_SUBJECT}
        icon={<EuiImage size="m" margin="m" src={noDataIllustration} alt="" role="presentation" />}
        title={
          <h2>
            <FormattedMessage
              id="xpack.cloudDefend.cloudDefendPage.packageNotInstalledRenderer.promptTitle"
              defaultMessage="Detect container drift and block malicious behavior at the source!"
            />
          </h2>
        }
        layout="horizontal"
        color="plain"
        body={
          <p>
            <FormattedMessage
              id="xpack.cloudDefend.cloudDefendPage.packageNotInstalledRenderer.promptDescription"
              defaultMessage="Add the Defend for containers (D4C) integration to begin. {learnMore}."
              values={{
                learnMore: (
                  <EuiLink href={docsLink}>
                    <FormattedMessage
                      id="xpack.cloudDefend.cloudDefendPage.packageNotInstalledRenderer.learnMoreTitle"
                      defaultMessage="Learn more about Defend for containers (D4C)"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
        actions={
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill href={addIntegrationLink}>
                <FormattedMessage
                  id="xpack.cloudDefend.cloudDefendPage.packageNotInstalledRenderer.addCloudDefendmIntegrationButtonTitle"
                  defaultMessage="Add D4C Integration"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </FullSizeCenteredPage>
  );
};

const defaultLoadingRenderer = () => (
  <LoadingState data-test-subj={LOADING_STATE_TEST_SUBJECT}>
    <FormattedMessage
      id="xpack.cloudDefend.cloudDefendPage.loadingDescription"
      defaultMessage="Loading..."
    />
  </LoadingState>
);

const defaultErrorRenderer = (error: unknown) => (
  <FullSizeCenteredPage>
    <EuiEmptyPrompt
      color="danger"
      iconType="warning"
      data-test-subj={ERROR_STATE_TEST_SUBJECT}
      title={
        <h2>
          <FormattedMessage
            id="xpack.cloudDefend.cloudDefendPage.errorRenderer.errorTitle"
            defaultMessage="We couldn't fetch your cloud defend data"
          />
        </h2>
      }
      body={
        isCommonError(error) ? (
          <p>
            <FormattedMessage
              id="xpack.cloudDefend.cloudDefendPage.errorRenderer.errorDescription"
              defaultMessage="{error} {statusCode}: {body}"
              values={{
                error: error.body.error,
                statusCode: error.body.statusCode,
                body: error.body.message,
              }}
            />
          </p>
        ) : undefined
      }
    />
  </FullSizeCenteredPage>
);

const defaultNoDataRenderer = (docsLink: string) => (
  <FullSizeCenteredPage>
    <NoDataPage
      data-test-subj={DEFAULT_NO_DATA_TEST_SUBJECT}
      pageTitle={i18n.translate('xpack.cloudDefend.cloudDefendPage.defaultNoDataConfig.pageTitle', {
        defaultMessage: 'No data found',
      })}
      solution={i18n.translate(
        'xpack.cloudDefend.cloudDefendPage.defaultNoDataConfig.solutionNameLabel',
        {
          defaultMessage: 'Defend for containers',
        }
      )}
      docsLink={docsLink}
      logo={'logoSecurity'}
      actions={{}}
    />
  </FullSizeCenteredPage>
);

const subscriptionNotAllowedRenderer = () => (
  <FullSizeCenteredPage data-test-subj={SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT}>
    <SubscriptionNotAllowed />
  </FullSizeCenteredPage>
);

interface CloudDefendPageProps<TData, TError> {
  children: React.ReactNode;
  query?: UseQueryResult<TData, TError>;
  loadingRender?: () => React.ReactNode;
  errorRender?: (error: TError) => React.ReactNode;
  noDataRenderer?: (docsLink: string) => React.ReactNode;
}

export const CloudDefendPage = <TData, TError>({
  children,
  query,
  loadingRender = defaultLoadingRenderer,
  errorRender = defaultErrorRenderer,
  noDataRenderer = defaultNoDataRenderer,
}: CloudDefendPageProps<TData, TError>) => {
  const subscriptionStatus = useSubscriptionStatus();
  const getSetupStatus = useCloudDefendSetupStatusApi();
  const { addIntegrationLink, docsLink } = useCloudDefendIntegrationLinks();

  const render = () => {
    if (subscriptionStatus.isError) {
      return defaultErrorRenderer(subscriptionStatus.error);
    }

    if (subscriptionStatus.isLoading) {
      return defaultLoadingRenderer();
    }

    if (!subscriptionStatus.data) {
      return subscriptionNotAllowedRenderer();
    }

    if (getSetupStatus.isError) {
      return defaultErrorRenderer(getSetupStatus.error);
    }

    if (getSetupStatus.isLoading) {
      return defaultLoadingRenderer();
    }

    if (getSetupStatus.data.status === 'not-installed') {
      return packageNotInstalledRenderer({ addIntegrationLink, docsLink });
    }

    if (!query) {
      return children;
    }

    if (query.isError) {
      return errorRender(query.error);
    }

    if (query.isLoading) {
      return loadingRender();
    }

    if (!query.data) {
      return noDataRenderer(docsLink);
    }

    return children;
  };

  return <>{render()}</>;
};
