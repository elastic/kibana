/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import { RuleForm, useRuleTemplate } from '@kbn/response-ops-rule-form';
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

  const {
    id,
    ruleTypeId: ruleTypeIdParams,
    templateId: templateIdParams,
  } = useParams<{
    id?: string;
    ruleTypeId?: string;
    templateId?: string;
  }>();

  const templateId = templateIdParams;

  const {
    data: ruleTemplate,
    error: ruleTemplateError,
    isLoading: isLoadingRuleTemplate,
    isError: isErrorRuleTemplate,
  } = useRuleTemplate({
    http,
    templateId,
  });

  const ruleTypeId = ruleTypeIdParams ?? ruleTemplate?.ruleTypeId;

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
      ...(ruleTypeId || templateId
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

  if (isLoadingRuleTemplate) {
    return (
      <ObservabilityPageTemplate data-test-subj="rulePage">
        <HeaderMenu />
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.observability.ruleForm.loadingTemplate', {
                defaultMessage: 'Loading rule template...',
              })}
            </h2>
          }
        />
      </ObservabilityPageTemplate>
    );
  }

  if (isErrorRuleTemplate) {
    return (
      <ObservabilityPageTemplate data-test-subj="rulePage">
        <HeaderMenu />
        <EuiCallOut
          title={i18n.translate('xpack.observability.ruleForm.templateError.title', {
            defaultMessage: 'Error loading rule template',
          })}
          color="danger"
          iconType="error"
        >
          <p>
            {(ruleTemplateError as any)?.body?.message ??
              (ruleTemplateError as Error)?.message ??
              i18n.translate('xpack.observability.ruleForm.templateError.description', {
                defaultMessage: 'There was an error loading the rule template. Please try again.',
              })}
          </p>
        </EuiCallOut>
      </ObservabilityPageTemplate>
    );
  }

  return (
    <ObservabilityPageTemplate data-test-subj="rulePage">
      <HeaderMenu />
      <EnhancedRulesCallout ruleTypeId={ruleTypeId} />
      <RuleForm
        key={ruleTypeId || templateId}
        initialValues={ruleTemplate}
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
        multiConsumerSelection={AlertConsumers.ALERTS}
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
