/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiTitle, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import styled from '@emotion/styled';
import { ColumnarPage, PageContent } from '../components/page';

const DetailPageContent = styled(PageContent)`
  overflow: auto;
  background-color: ${(props) => props.theme.euiTheme.colors.lightestShade};
`;

interface Props {
  message: string;
}

export const Error: React.FC<Props> = ({ message }) => {
  return (
    <ColumnarPage>
      <DetailPageContent>
        <ErrorPageBody message={message} />
      </DetailPageContent>
    </ColumnarPage>
  );
};

export const ErrorPageBody: React.FC<{ message: string }> = ({ message }) => {
  return (
    <EuiPageTemplate offset={0} restrictWidth={false} bottomBorder={false} grow={false}>
      <EuiPageTemplate.Header>
        <EuiTitle size="m">
          <h1>
            <FormattedMessage
              id="xpack.infra.errorPage.unexpectedErrorTitle"
              defaultMessage="Oops!"
            />
          </h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiCallOut color="danger" title={message} iconType="error">
          <p>
            <FormattedMessage
              id="xpack.infra.errorPage.tryAgainDescription "
              defaultMessage="Please click the back button and try again."
            />
          </p>
        </EuiCallOut>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
