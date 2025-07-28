/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { RuleForm } from '@kbn/response-ops-rule-form';
import { useLocation, useParams } from 'react-router-dom';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';
import { paths } from '../../../common/locators/paths';
import { observabilityRuleCreationValidConsumers } from '../../../common/constants';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { EnhancedRulesCallout } from './enhanced_rules_callout';

export function RulePage() {
  const {
    http,
    docLinks,
    observabilityAIAssistant,
    application,
    notifications,
    charts,
    serverless,
    settings,
    data,
    dataViews,
    unifiedSearch,
    actionTypeRegistry,
    ruleTypeRegistry,
    chrome,
    contentManagement,
    ...startServices
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  const { returnApp, returnPath } = location.state || {};

  const { id, ruleTypeId } = useParams<{
    id?: string;
    ruleTypeId?: string;
  }>();

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
          defaultMessage: 'Alerts',
        }),
        href: http.basePath.prepend(paths.observability.alerts),
        deepLinkId: 'observability-overview:alerts',
      },
      {
        href: http.basePath.prepend(paths.observability.rules),
        text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
          defaultMessage: 'Rules',
        }),
      },
      ...(ruleTypeId
        ? [
            {
              text: i18n.translate('xpack.observability.breadcrumbs.createLinkText', {
                defaultMessage: 'Create',
              }),
            },
          ]
        : []),
      ...(id
        ? [
            {
              text: i18n.translate('xpack.observability.breadcrumbs.editLinkText', {
                defaultMessage: 'Edit',
              }),
            },
          ]
        : []),
    ],
    { serverless }
  );

  return (
    <ObservabilityPageTemplate data-test-subj="rulePage">
      <HeaderMenu />
      <EnhancedRulesCallout ruleTypeId={ruleTypeId} />
      <RuleForm
        key={ruleTypeId}
        plugins={{
          http,
          application,
          notifications,
          charts,
          settings,
          data,
          dataViews,
          unifiedSearch,
          docLinks,
          ruleTypeRegistry,
          actionTypeRegistry,
          contentManagement,
          ...startServices,
        }}
        id={id}
        ruleTypeId={ruleTypeId}
        validConsumers={observabilityRuleCreationValidConsumers}
        multiConsumerSelection={AlertConsumers.LOGS}
        onCancel={() => {
          if (returnApp && returnPath) {
            application.navigateToApp(returnApp, { path: returnPath });
          } else {
            return application.navigateToUrl(http.basePath.prepend(paths.observability.rules));
          }
        }}
        onSubmit={(ruleId) => {
          return application.navigateToUrl(
            http.basePath.prepend(paths.observability.ruleDetails(ruleId))
          );
        }}
      />
    </ObservabilityPageTemplate>
  );
}
