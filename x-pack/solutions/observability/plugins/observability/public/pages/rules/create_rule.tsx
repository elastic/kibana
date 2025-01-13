/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { RuleForm } from '@kbn/response-ops-rule-form';
import { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { useLocation, useParams } from 'react-router-dom';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';
import { paths } from '../../../common/locators/paths';
import { usePluginContext } from '../../hooks/use_plugin_context';

interface RuleFormServices extends CoreStart {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

interface CreateRulePageProps {
  ruleTypeId: string;
}

export function CreateRulePage() {
  const { ruleTypeId } = useParams<CreateRulePageProps>();
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
    setBreadcrumbs,
    ...startServices
  } = useKibana<RuleFormServices>().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  //   const history = useHistory();
  //   const [ruleTypeModalVisibility, setRuleTypeModalVisibility] = useState<boolean>(false);
  //   const [ruleTypeIdToCreate, setRuleTypeIdToCreate] = useState<string | undefined>(undefined);
  //   const [addRuleFlyoutVisibility, setAddRuleFlyoutVisibility] = useState(false);
  //   const [stateRefresh, setRefresh] = useState(new Date());
  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  //   const { id, ruleTypeId } = useParams<{
  //     id?: string;
  //     ruleTypeId?: string;
  //   }>();
  const { returnApp, returnPath } = location.state || {};

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
      {
        text:
          ruleTypeId &&
          i18n.translate('xpack.observability.breadcrumbs.createLinkText', {
            defaultMessage: 'Create',
          }),
      },
    ],
    { serverless }
  );
  // Set breadcrumb and page title
  //   useEffect(() => {
  //     if (id) {
  //       setBreadcrumbs([{ text: 'Rules' }]);
  //       // chrome.docTitle.change(getCurrentDocTitle('editRule'));
  //     }
  //     if (ruleTypeId) {
  //       setBreadcrumbs([
  //         { text: 'Rules', href: '/app/observability/alerts/rules' },
  //         { text: 'Create' },
  //       ]);
  //       chrome.docTitle.change('Create rule');
  //     }
  //     // eslint-disable-next-line react-hooks/exhaustive-deps
  //   }, []);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.rules.CreateTitle', {
          defaultMessage: 'Create',
        }),
      }}
      data-test-subj="createRulePage"
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
            const createRuleLink = http.basePath.prepend(
              paths.observability.ruleCreate(ruleTypeId)
            );
            return application.navigateToUrl(createRuleLink);
          }
        }}
        onSubmit={(ruleId) => {
          // application.navigateToApp('management', {
          //   path: `insightsAndAlerting/triggersActions/${getRuleDetailsRoute(ruleId)}`,
          // });
          console.log('Rule ID:', ruleId);
        }}
      />
    </ObservabilityPageTemplate>
  );
}
