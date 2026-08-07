/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { RuleTypeModal } from '@kbn/response-ops-rule-form';
import { getCreateRuleFromTemplateRoute, getCreateRuleRoute } from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks';
import { useHistory, useLocation } from 'react-router-dom';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../utils/kibana_react';
import { useGetFilteredRuleTypes } from '../../../hooks/use_get_filtered_rule_types';
import { useGetAvailableRulesWithDescriptions } from '../../../hooks/use_get_available_rules_with_descriptions';
import { RulesTab } from '../../rules/rules_tab';
import { getRulesIaTabs, type RulesIaTabId } from '../get_rules_ia_tabs';
import { ALERTING_RULES_HUB_PATH, paths } from '../../../../common/locators/paths';

function getTabFromSearch(search: string): RulesIaTabId {
  const tab = new URLSearchParams(search).get('tab');
  // Default to ES|QL rules (first tab). Classic rules uses ?tab=v1.
  return tab === 'v1' ? 'v1' : 'v2';
}

/**
 * Combined Rules hub for the Alerting IA POC.
 * Client-side tabs switch Alerts and insights (v1) ↔ Alerting v2 without
 * navigating to Stack Management. Rules Library is only in the Alerts sub-menu.
 */
export function RulesHubPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();
  const location = useLocation();
  const {
    services: {
      http,
      notifications: { toasts },
      application,
      triggersActionsUi: { ruleTypeRegistry },
      serverless,
      observabilityAIAssistant,
      cps,
      alertingVTwo,
    },
  } = useKibana();
  const [ruleTypeModalVisibility, setRuleTypeModalVisibility] = useState(false);
  const [stateRefresh, setRefresh] = useState(new Date());
  const [v2HeaderMenu, setV2HeaderMenu] = useState<AppHeaderMenu | undefined>();
  const [selectedTab, setSelectedTab] = useState<RulesIaTabId>(() =>
    getTabFromSearch(location.search)
  );

  useEffect(() => {
    setSelectedTab(getTabFromSearch(location.search));
  }, [location.search]);

  const selectTab = useCallback(
    (tab: RulesIaTabId) => {
      setSelectedTab(tab);
      if (tab !== 'v2') {
        setV2HeaderMenu(undefined);
      }
      const nextSearch = tab === 'v1' ? '?tab=v1' : '';
      history.replace(`${ALERTING_RULES_HUB_PATH}${nextSearch}`);
    },
    [history]
  );

  const onV2HeaderMenuChange = useCallback((menu: AppHeaderMenu | undefined) => {
    setV2HeaderMenu(menu);
  }, []);

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.alerts', {
          defaultMessage: 'Alerts',
        }),
      },
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.rules', {
          defaultMessage: 'Rules',
        }),
      },
    ],
    { serverless }
  );

  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes,
  });
  const ruleTypesWithDescriptions = useGetAvailableRulesWithDescriptions();
  const { setScreenContext } = observabilityAIAssistant?.service || {};

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: `The rule types that are available are: ${JSON.stringify(
        ruleTypesWithDescriptions
      )}`,
    });
  }, [ruleTypesWithDescriptions, setScreenContext]);

  const tabs = useMemo(
    () => getRulesIaTabs({ selected: selectedTab, onSelect: selectTab }),
    [selectedTab, selectTab]
  );

  const classicAppMenu = useMemo<AppMenuConfig | undefined>(() => {
    if (selectedTab !== 'v1') {
      return undefined;
    }
    return {
      primaryActionItem: {
        id: 'createRule',
        label: i18n.translate('xpack.observability.alertingIa.rulesHub.create', {
          defaultMessage: 'Create rule',
        }),
        iconType: 'plusInCircle',
        disabled: !authorizedToCreateAnyRules,
        run: () => setRuleTypeModalVisibility(true),
        testId: 'alertingIaCreateRuleButton',
      },
    };
  }, [authorizedToCreateAnyRules, selectedTab]);

  const appMenu = selectedTab === 'v2' ? v2HeaderMenu : classicAppMenu;

  const EmbeddedRulesList = alertingVTwo?.EmbeddedRulesList;

  return (
    <ObservabilityPageTemplate data-test-subj="observabilityRulesHubPage">
      <AppHeader
        title={i18n.translate('xpack.observability.alertingIa.rulesHub.title', {
          defaultMessage: 'Rules',
        })}
        menu={appMenu}
        tabs={tabs}
        spacing="largeBleed"
      />
      <EuiSpacer size="l" />
      {selectedTab === 'v1' ? (
        <>
          <RulesTab setRefresh={setRefresh} stateRefresh={stateRefresh} />
          {ruleTypeModalVisibility && (
            <RuleTypeModal
              onClose={() => setRuleTypeModalVisibility(false)}
              onSelectRuleType={(ruleTypeId) => {
                setRuleTypeModalVisibility(false);
                return application.navigateToApp('rules', {
                  path: `${getCreateRuleRoute(ruleTypeId)}`,
                });
              }}
              onSelectTemplate={(templateId) => {
                setRuleTypeModalVisibility(false);
                return application.navigateToApp('rules', {
                  path: `${getCreateRuleFromTemplateRoute(templateId)}`,
                });
              }}
              http={http}
              toasts={toasts}
              registeredRuleTypes={ruleTypeRegistry.list()}
              filteredRuleTypes={filteredRuleTypes}
              cps={cps}
            />
          )}
        </>
      ) : EmbeddedRulesList ? (
        <EmbeddedRulesList
          onHeaderMenuChange={onV2HeaderMenuChange}
          getRuleDetailsHref={(ruleId) =>
            http.basePath.prepend(paths.observability.rulesHubRuleDetails(ruleId))
          }
        />
      ) : (
        <EuiCallOut
          title={i18n.translate('xpack.observability.alertingIa.rulesHub.v2UnavailableTitle', {
            defaultMessage: 'Alerting v2 is not available',
          })}
          color="warning"
        >
          <p>
            {i18n.translate('xpack.observability.alertingIa.rulesHub.v2UnavailableBody', {
              defaultMessage:
                'Enable Alerting v2 to manage ES|QL-native rules from this hub.',
            })}
          </p>
        </EuiCallOut>
      )}
    </ObservabilityPageTemplate>
  );
}
