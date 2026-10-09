/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { type RouteComponentProps } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PageUrlParams } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { AppHeader } from '@kbn/app-header';
import { RulesContainer } from './rules_container';
import { cloudPosturePages } from '../../common/navigation/constants';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { useSecuritySolutionContext } from '../../application/security_solution_context';
import { useCspBenchmarkIntegrationsV2 } from '../benchmarks/use_csp_benchmark_integrations';
import { getBenchmarkCisName } from '../../../common/utils/helpers';
import { useKibana } from '../../common/hooks/use_kibana';

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const benchmarksInfo = useCspBenchmarkIntegrationsV2();
  const SpyRoute = useSecuritySolutionContext()?.getSpyRouteComponent();
  const { application } = useKibana().services;

  const pageTitle = i18n.translate('xpack.csp.rules.rulePageHeader.pageHeaderTitle', {
    defaultMessage: '{benchmarkName} {benchmarkVersion} - Rules',
    values: {
      benchmarkName: getBenchmarkCisName(params.benchmarkId),
      benchmarkVersion: params.benchmarkVersion,
    },
  });

  const backTarget = useMemo(
    () => ({
      href: application.getUrlForApp('securitySolutionUI', {
        path: cloudPosturePages.benchmarks.path,
      }),
      label: i18n.translate('xpack.csp.rules.rulesPageHeader.backToBenchmarksLabel', {
        defaultMessage: 'Benchmarks',
      }),
    }),
    [application]
  );

  return (
    <CloudPosturePage query={benchmarksInfo}>
      <AppHeader title={pageTitle} back={backTarget} spacing="bleed" />
      <EuiSpacer />
      <RulesContainer />
      {SpyRoute && (
        <SpyRoute
          pageName={cloudPosturePages.benchmarks.id}
          state={{ ruleName: getBenchmarkCisName(params.benchmarkId) }}
        />
      )}
    </CloudPosturePage>
  );
};
