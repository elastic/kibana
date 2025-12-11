/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import ReactDOM from 'react-dom';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiCode,
} from '@elastic/eui';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { callKubernetesPocApi } from '../services/rest/create_call_api';

const KubernetesPocApp: React.FC<{ core: CoreStart }> = ({ core }) => {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchHelloWorld = async () => {
    setLoading(true);
    try {
      const response = await callKubernetesPocApi('GET /internal/kubernetes_poc/hello_world', {
        signal: null,
      });
      setMessage(JSON.stringify(response, null, 2));
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EuiPage restrictWidth>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="Kubernetes POC Plugin"
          description="A proof of concept plugin for Kubernetes observability"
        />
        <EuiPageSection>
          <EuiText>
            <h2>
              {i18n.translate('xpack.kubernetesPoc.application.app.h2.helloWorldLabel', {
                defaultMessage: 'Hello World',
              })}
            </h2>
            <p>
              {i18n.translate('xpack.kubernetesPoc.application.app.p.thisIsABasicLabel', {
                defaultMessage: 'This is a basic Hello World plugin with API integration.',
              })}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiButton
            data-test-subj="kubernetesPocKubernetesPocAppCallHelloWorldApiButton"
            onClick={fetchHelloWorld}
            isLoading={loading}
          >
            {i18n.translate('xpack.kubernetesPoc.application.app.callHelloWorldAPIButtonLabel', {
              defaultMessage: 'Call Hello World API',
            })}
          </EuiButton>
          {message && (
            <>
              <EuiSpacer />
              <EuiText>
                <h3>
                  {i18n.translate('xpack.kubernetesPoc.application.app.h3.apiResponseLabel', {
                    defaultMessage: 'API Response:',
                  })}
                </h3>
                <EuiCode block>{message}</EuiCode>
              </EuiText>
            </>
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderApp = (core: CoreStart, { element }: AppMountParameters) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KubernetesPocApp core={core} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
