/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { useBoolean } from '@kbn/react-hooks';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { getCreateRuleFromTemplateRoute, getCreateRuleRoute } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import {
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../../constants';
import { buildRuleManagementAgentMessage } from './build_rule_management_agent_message';
import {
  MixedClassicRuleTypesFlyout,
  MixedCreateRuleFlyout,
} from './mixed_create_rule_flyout';

const CREATE_BUTTON_SELECTOR = '[data-test-subj="createRuleButton"]';

export const MixedCreateRuleSession = ({
  coreStart,
  alertingVTwo,
  triggersActionsUi,
  includeClassic,
  includeEsql,
}: {
  coreStart: CoreStart;
  alertingVTwo: AlertingV2PublicStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  includeClassic: boolean;
  includeEsql: boolean;
}) => {
  const history = useHistory();
  const [createHistoryKey, setCreateHistoryKey] = useState(() => Symbol('mixedCreateRule'));
  const [isChooserOpen, { on: openChooser, off: closeChooser }] = useBoolean(false);
  const [isClassicChooserOpen, { on: openClassicChooser, off: closeClassicChooser }] =
    useBoolean(false);
  const [isEsqlOptionsOpen, { on: openEsqlOptions, off: closeEsqlOptions }] = useBoolean(false);
  const [v2InitialStep, setV2InitialStep] = useState<'esql' | 'threshold' | undefined>();
  const [classicInitialSearch, setClassicInitialSearch] = useState('');

  const closeCreateSession = useCallback(() => {
    closeEsqlOptions();
    closeClassicChooser();
    closeChooser();
    setClassicInitialSearch('');
  }, [closeChooser, closeClassicChooser, closeEsqlOptions]);

  const browseClassic = useCallback(
    (search?: string) => {
      setClassicInitialSearch(typeof search === 'string' ? search.trim() : '');
      openClassicChooser();
    },
    [openClassicChooser]
  );

  const startCreate = useCallback(() => {
    setCreateHistoryKey(Symbol('mixedCreateRule'));
    setV2InitialStep(undefined);
    setClassicInitialSearch('');
    closeEsqlOptions();
    closeClassicChooser();
    if (includeEsql) {
      openChooser();
      return;
    }
    if (includeClassic) {
      openClassicChooser();
    }
  }, [
    closeClassicChooser,
    closeEsqlOptions,
    includeClassic,
    includeEsql,
    openChooser,
    openClassicChooser,
  ]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(CREATE_BUTTON_SELECTOR)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      startCreate();
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [startCreate]);

  const openV2Authoring = useCallback(
    (step: 'esql' | 'threshold') => {
      setV2InitialStep(step);
      openEsqlOptions();
    },
    [openEsqlOptions]
  );

  const onChooseAgent = useCallback(
    (userInput?: string) => {
      closeCreateSession();
      coreStart.application.navigateToApp(AGENT_BUILDER_APP_ID, {
        path: '/agents/elastic-ai-agent/conversations/new',
        state: {
          initialMessage: buildRuleManagementAgentMessage(userInput),
        },
      });
    },
    [closeCreateSession, coreStart.application]
  );

  const onChooseSequence = useCallback(() => {
    closeCreateSession();
    history.push(`${OBSERVABILITY_ALERTING_RULES_V2_PATH}/sequence/create`);
  }, [closeCreateSession, history]);

  const onSelectRuleType = useCallback(
    (ruleTypeId: string) => {
      closeCreateSession();
      history.push(`${OBSERVABILITY_ALERTING_RULES_V1_PATH}${getCreateRuleRoute(ruleTypeId)}`);
    },
    [closeCreateSession, history]
  );

  const onSelectTemplate = useCallback(
    (templateId: string) => {
      closeCreateSession();
      history.push(
        `${OBSERVABILITY_ALERTING_RULES_V1_PATH}${getCreateRuleFromTemplateRoute(
          encodeURIComponent(templateId)
        )}`
      );
    },
    [closeCreateSession, history]
  );

  return (
    <>
      {isChooserOpen ? (
        <MixedCreateRuleFlyout
          onClose={closeCreateSession}
          onChooseThreshold={() => openV2Authoring('threshold')}
          onChooseEsql={() => openV2Authoring('esql')}
          onChooseAgent={onChooseAgent}
          onChooseSequence={onChooseSequence}
          onBrowseClassic={browseClassic}
          showClassic={includeClassic}
          http={coreStart.http}
          toasts={coreStart.notifications.toasts}
          registeredRuleTypes={triggersActionsUi.ruleTypeRegistry.list()}
          historyKey={createHistoryKey}
        />
      ) : null}
      {isClassicChooserOpen ? (
        <MixedClassicRuleTypesFlyout
          onClose={closeClassicChooser}
          onSelectClassicRuleType={onSelectRuleType}
          onSelectTemplate={onSelectTemplate}
          http={coreStart.http}
          toasts={coreStart.notifications.toasts}
          registeredRuleTypes={triggersActionsUi.ruleTypeRegistry.list()}
          historyKey={createHistoryKey}
          initialSearch={classicInitialSearch}
        />
      ) : null}
      {isEsqlOptionsOpen ? (
        <alertingVTwo.CreateRuleOptionsFlyout
          key={v2InitialStep}
          onClose={closeEsqlOptions}
          onCreated={closeCreateSession}
          history={history}
          initialStep={v2InitialStep}
          historyKey={createHistoryKey}
        />
      ) : null}
    </>
  );
};
