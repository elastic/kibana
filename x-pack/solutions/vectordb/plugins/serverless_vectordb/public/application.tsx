/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import type { AppMountParameters } from '@kbn/core/public';

const VectordbHome: React.FC = () => (
  <EuiPageTemplate restrictWidth={false}>
    <EuiPageTemplate.EmptyPrompt>
      <EuiEmptyPrompt iconType="logoElasticsearch" title={<h1>Welcome to Vector DB</h1>} />
    </EuiPageTemplate.EmptyPrompt>
  </EuiPageTemplate>
);

export function renderApp({ element }: AppMountParameters) {
  ReactDOM.render(<VectordbHome />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
}
