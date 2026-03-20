/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { EuiCallOut, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiCode } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { ALERT_INVESTIGATION_PIPELINE_ENABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common';
import type { ElasticAssistantPublicPluginStartDependencies } from '../types';
import { KibanaContextProvider } from './context/typed_kibana_context/typed_kibana_context';
import { ReactQueryClientProvider } from './context/query_client_context/elastic_assistant_query_client_provider';
import { PipelineDashboard } from './components/pipeline_dashboard/pipeline_dashboard';

const PipelineFeatureFlagGuard: React.FC<{ coreStart: CoreStart }> = ({ coreStart }) => {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        const enabled = await coreStart.featureFlags.getBooleanValue(
          ALERT_INVESTIGATION_PIPELINE_ENABLED_FEATURE_FLAG,
          false
        );
        setIsEnabled(enabled);
      } catch (error) {
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFeatureFlag();
  }, [coreStart]);

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!isEnabled) {
    return (
      <div style={{ padding: '40px' }}>
        <EuiCallOut
          title="Alert Investigation Pipeline is disabled"
          color="warning"
          iconType="flag"
        >
          <p>
            This feature is experimental and disabled by default. To enable it, add the following to
            your <EuiCode>kibana.yml</EuiCode>:
          </p>
          <EuiCode language="yaml">
            xpack.feature_flags.overrides.elasticAssistant.alertInvestigationPipelineEnabled: true
          </EuiCode>
          <p style={{ marginTop: '16px' }}>
            <strong>Note:</strong> This is a spike/proof-of-concept. See{' '}
            <a
              href="https://github.com/elastic/security-team/issues/16339"
              target="_blank"
              rel="noopener noreferrer"
            >
              security-team#16339
            </a>{' '}
            for details.
          </p>
        </EuiCallOut>
      </div>
    );
  }

  return <PipelineDashboard />;
};

export const renderPipelineDashboard = (
  coreStart: CoreStart,
  dependencies: ElasticAssistantPublicPluginStartDependencies,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaContextProvider
        services={{
          appName: 'alertInvestigationPipeline',
          ...coreStart,
          ...dependencies,
        }}
      >
        <KibanaThemeProvider {...coreStart}>
          <ReactQueryClientProvider>
            <PipelineFeatureFlagGuard coreStart={coreStart} />
          </ReactQueryClientProvider>
        </KibanaThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
