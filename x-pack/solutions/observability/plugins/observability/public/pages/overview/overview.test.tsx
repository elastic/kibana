/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@elastic/eui/lib/test/rtl';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { render } from '../../utils/test_helper';
import { OverviewPage } from './overview';
import * as hasDataHook from '../../hooks/use_has_data';
import * as pluginContext from '../../hooks/use_plugin_context';
import type { HasDataContextValue } from '../../context/has_data_context/has_data_context';
import type { ConfigSchema, ObservabilityPublicPluginsStart } from '../../plugin';

const ONBOARDING_HREF = '/app/observabilityOnboarding';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useBreadcrumbs: jest.fn(),
}));

jest.mock('@kbn/ebt-tools', () => ({
  ...jest.requireActual('@kbn/ebt-tools'),
  usePageReady: jest.fn(),
}));

jest.mock('../../utils/kibana_react', () => {
  const { coreMock } = jest.requireActual('@kbn/core/public/mocks');
  const core = coreMock.createStart();
  return {
    useKibana: () => ({
      services: {
        ...core,
        share: {
          url: {
            locators: {
              get: () => ({ useUrl: () => ONBOARDING_HREF }),
            },
          },
        },
      },
    }),
  };
});

describe('OverviewPage', () => {
  beforeAll(() => {
    const config: ConfigSchema = {
      unsafe: { alertDetails: { uptime: { enabled: false } } },
      managedOtlpServiceUrl: '',
    };
    jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
      appMountParameters: {} as AppMountParameters,
      core: {} as CoreStart,
      config,
      plugins: {} as ObservabilityPublicPluginsStart,
      observabilityRuleTypeRegistry: {} as ReturnType<
        typeof import('../../rules/observability_rule_type_registry_mock').createObservabilityRuleTypeRegistryMock
      >,
      ObservabilityPageTemplate: KibanaPageTemplate,
    }));
  });

  it('renders the no-data prompt with an "Add data" CTA linking to onboarding when no section has data', () => {
    // Every overview data section reports success with no data, so `hasAnyData`
    // is false and the empty-state prompt is the only branch that can render.
    jest.spyOn(hasDataHook, 'useHasData').mockReturnValue({
      hasDataMap: {
        alert: { status: FETCH_STATUS.SUCCESS, hasData: false },
        infra_logs: { status: FETCH_STATUS.SUCCESS, hasData: false },
        infra_metrics: { status: FETCH_STATUS.SUCCESS, hasData: false },
        apm: { status: FETCH_STATUS.SUCCESS, hasData: false },
        ux: { status: FETCH_STATUS.SUCCESS, hasData: false },
      },
    } as HasDataContextValue);

    render(<OverviewPage />);

    expect(screen.getByTestSubject('obltOverviewNoDataPrompt')).toBeInTheDocument();
    expect(screen.getByTestSubject('o11yOverviewPageAddDataButton')).toHaveAttribute(
      'href',
      ONBOARDING_HREF
    );
  });
});
