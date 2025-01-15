/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { RuleForm } from '@kbn/response-ops-rule-form';
import { ChromeBreadcrumb, CoreStart, HttpSetup } from '@kbn/core/public';
import { useLocation, useParams } from 'react-router-dom';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';
import { OBSERVABILITY_BASE_PATH, paths } from '../../../common/locators/paths';
import { usePluginContext } from '../../hooks/use_plugin_context';

interface RuleFormServices extends CoreStart {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

interface RulePageProps {
  ruleTypeId?: string;
  id?: string;
}

const getExistingBreadCrumbs = (http: HttpSetup): ChromeBreadcrumb[] => {
  return [
    {
      text: i18n.translate('xpack.observability.nameFeatureTitle', {
        defaultMessage: 'Observability',
      }),
      href: http.basePath.prepend(OBSERVABILITY_BASE_PATH),
      deepLinkId: 'observability-overview',
    },
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
  ];
};

export function RulePage() {
  const { ruleTypeId, id } = useParams<RulePageProps>();
  const {
    http,
    docLinks,
    observabilityAIAssistant,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    serverless,
    actionTypeRegistry,
    ruleTypeRegistry,
    chrome,
    ...startServices
  } = useKibana<RuleFormServices>().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  const { returnApp, returnPath } = location.state || {};

  useEffect(() => {
    if (id) {
      chrome.setBreadcrumbs([
        ...getExistingBreadCrumbs(http),
        {
          text: i18n.translate('xpack.observability.breadcrumbs.editLinkText', {
            defaultMessage: 'Edit',
          }),
        },
      ]);
      chrome.docTitle.change(
        i18n.translate('xpack.observability.breadcrumbs.editLinkText', {
          defaultMessage: 'Edit Rule',
        })
      );
    }
    if (ruleTypeId) {
      chrome.setBreadcrumbs([
        ...getExistingBreadCrumbs(http),
        {
          text: i18n.translate('xpack.observability.breadcrumbs.createLinkText', {
            defaultMessage: 'Create',
          }),
        },
      ]);
      chrome.docTitle.change(
        i18n.translate('xpack.observability.breadcrumbs.editLinkText', {
          defaultMessage: 'Create Rule',
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.rules.CreateTitle', {
          defaultMessage: id ? 'Edit' : 'Create',
        }),
      }}
      data-test-subj="rulePage"
    >
      <HeaderMenu />
      <RuleForm
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
          ...startServices,
        }}
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
