/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

interface Props {
  'data-test-subj': string;
  appTitle: string;
  pageContent: React.ReactElement<any>;
}

export const TestAppShell = (props: Props) => {
  return (
    <EuiPage data-test-subj={props['data-test-subj']}>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiTitle size="l">
            <h1>{props.appTitle}</h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>{props.pageContent}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
