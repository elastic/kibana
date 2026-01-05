/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { UseQueryResult } from '@kbn/react-query';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data';
import { NoDataPage } from '@kbn/shared-ux-page-no-data';
import { FullSizeCenteredPage } from './full_size_centered_page';
import { CspLoadingState } from './csp_loading_state';

export const LOADING_STATE_TEST_SUBJECT = 'cloud_posture_page_loading';
export const ERROR_STATE_TEST_SUBJECT = 'cloud_posture_page_error';
export const PACKAGE_NOT_INSTALLED_TEST_SUBJECT = 'cloud_posture_page_package_not_installed';
export const CSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT = 'cloud_posture_page_cspm_not_installed';
export const KSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT = 'cloud_posture_page_kspm_not_installed';
export const DEFAULT_NO_DATA_TEST_SUBJECT = 'cloud_posture_page_no_data';

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

export interface CspNoDataPageProps {
  docsLink: NoDataPageProps['action']['elasticAgent']['docsLink'];
  actionHref: NoDataPageProps['action']['elasticAgent']['href'];
  actionTitle: NoDataPageProps['action']['elasticAgent']['title'];
  actionDescription: NoDataPageProps['action']['elasticAgent']['description'];
  dataTestSubj: string;
  buttonText: NoDataPageProps['action']['elasticAgent']['buttonText'];
}

export const CspNoDataPage = ({
  docsLink,
  actionHref,
  actionTitle,
  actionDescription,
  dataTestSubj,
  buttonText,
}: CspNoDataPageProps) => {
  return (
    <NoDataPage
      action={{
        elasticAgent: {
          docsLink,
          href: actionHref,
          buttonIsDisabled: !actionHref,
          title: actionTitle,
          description: actionDescription,
          'data-test-subj': dataTestSubj,
          buttonText,
        },
      }}
    />
  );
};

export const defaultLoadingRenderer = () => (
  <CspLoadingState data-test-subj={LOADING_STATE_TEST_SUBJECT}>
    <FormattedMessage
      id="xpack.csp.cloudPosturePage.loadingDescription"
      defaultMessage="Loading..."
    />
  </CspLoadingState>
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
            id="xpack.csp.cloudPosturePage.errorRenderer.errorTitle"
            defaultMessage="We couldn't fetch your cloud security posture data"
          />
        </h2>
      }
      body={
        isCommonError(error) ? (
          <p>
            <FormattedMessage
              id="xpack.csp.cloudPosturePage.errorRenderer.errorDescription"
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

export const defaultNoDataRenderer = () => (
  <FullSizeCenteredPage>
    <NoDataPage
      action={{
        elasticAgent: {
          'data-test-subj': DEFAULT_NO_DATA_TEST_SUBJECT,
          // TODO: Add real docs link once we have it
          docsLink: 'https://www.elastic.co/guide/index.html',
        },
      }}
    />
  </FullSizeCenteredPage>
);

interface CloudPosturePageProps<TData, TError> {
  children: React.ReactNode;
  query?: UseQueryResult<TData, TError>;
  loadingRender?: () => React.ReactNode;
  errorRender?: (error: TError) => React.ReactNode;
  noDataRenderer?: () => React.ReactNode;
}

export const CloudPosturePage = <TData, TError>({
  children,
  query,
  loadingRender = defaultLoadingRenderer,
  errorRender = defaultErrorRenderer,
  noDataRenderer = defaultNoDataRenderer,
}: CloudPosturePageProps<TData, TError>) => {
  const render = () => {
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
      return noDataRenderer();
    }

    return children;
  };

  return <>{render()}</>;
};
