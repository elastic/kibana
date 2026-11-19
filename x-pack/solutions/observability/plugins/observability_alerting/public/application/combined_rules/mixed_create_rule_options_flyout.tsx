/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type {
  CreateRuleOptionsFlyoutLegacyItem,
  CreateRuleOptionsFlyoutProps,
} from '@kbn/alerting-v2-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { useBoolean } from '@kbn/react-hooks';
import { getCreateRuleFromTemplateRoute, getCreateRuleRoute } from '@kbn/rule-data-utils';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '@kbn/deeplinks-observability';
import {
  MixedClassicRuleTypesFlyout,
  MixedCreateRuleFlyout,
} from './mixed_create_rule_flyout';
import { useMixedCreatePrototypeSettings } from './mixed_create_prototype_settings';
import { openRuleAuthoringAgentChat } from './open_rule_authoring_agent_chat';

const noopSubscribe = () => () => {};

export const createMixedCreateRuleOptionsFlyout = ({
  DefaultCreateRuleOptionsFlyout,
  coreStart,
  triggersActionsUi,
  agentBuilder,
}: {
  DefaultCreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  coreStart: CoreStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
}): ComponentType<CreateRuleOptionsFlyoutProps> => {
  const MixedCreateRuleOptionsFlyout = (props: CreateRuleOptionsFlyoutProps) => {
    // Rule management MixedCreate stacks authoring with initialStep — never wrap that path.
    if (props.initialStep) {
      return <DefaultCreateRuleOptionsFlyout {...props} />;
    }

    return (
      <MixedCreateRuleOptionsFlyoutInner
        {...props}
        DefaultCreateRuleOptionsFlyout={DefaultCreateRuleOptionsFlyout}
        coreStart={coreStart}
        triggersActionsUi={triggersActionsUi}
        agentBuilder={agentBuilder}
      />
    );
  };

  MixedCreateRuleOptionsFlyout.displayName = 'MixedCreateRuleOptionsFlyout';
  return MixedCreateRuleOptionsFlyout;
};

const MixedCreateRuleOptionsFlyoutInner = ({
  onClose,
  initialQuery,
  esqlVariables,
  legacyRuleTypes,
  subscribe,
  getQuery,
  getEsqlVariables,
  history,
  historyKey: historyKeyProp,
  onCreated,
  DefaultCreateRuleOptionsFlyout,
  coreStart,
  triggersActionsUi,
  agentBuilder,
}: CreateRuleOptionsFlyoutProps & {
  DefaultCreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  coreStart: CoreStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
}) => {
  const generatedHistoryKey = useMemo(() => Symbol('discoverMixedCreateRule'), []);
  const historyKey = historyKeyProp ?? generatedHistoryKey;
  const [v2InitialStep, setV2InitialStep] = useState<'esql' | 'threshold' | undefined>();
  const [legacyItem, setLegacyItem] = useState<CreateRuleOptionsFlyoutLegacyItem | undefined>();
  const [isClassicChooserOpen, { on: openClassicChooser, off: closeClassicChooser }] =
    useBoolean(false);
  const [classicInitialSearch, setClassicInitialSearch] = useState('');
  const [isFlyoutMaximized, setIsFlyoutMaximized] = useState(false);
  const { settings: prototypeSettings } = useMixedCreatePrototypeSettings();

  const liveQuery = useSyncExternalStore(subscribe ?? noopSubscribe, () =>
    getQuery ? getQuery() : initialQuery
  );
  const discoverQuery = liveQuery ?? initialQuery;

  const closeAuthoring = useCallback(() => {
    setV2InitialStep(undefined);
  }, []);

  const closeLegacy = useCallback(() => {
    setLegacyItem(undefined);
  }, []);

  const closeAll = useCallback(() => {
    closeAuthoring();
    closeLegacy();
    closeClassicChooser();
    onClose();
  }, [closeAuthoring, closeClassicChooser, closeLegacy, onClose]);

  const onCloseRef = useRef(closeAll);
  onCloseRef.current = closeAll;

  useEffect(() => {
    if (!history) {
      return;
    }
    const initialPathname = history.location.pathname;
    const unlistenHistory = history.listen((location) => {
      if (location.pathname !== initialPathname) {
        onCloseRef.current();
      }
    });
    return () => {
      unlistenHistory();
    };
  }, [history]);

  const handleCreated = useCallback(() => {
    onCreated?.();
    closeAll();
  }, [closeAll, onCreated]);

  const openV2Authoring = useCallback((step: 'esql' | 'threshold') => {
    setV2InitialStep(step);
  }, []);

  const onChooseAgent = useCallback(
    (userInput?: string, esqlQuery?: string) => {
      openRuleAuthoringAgentChat({
        agentBuilder,
        application: coreStart.application,
        userInput,
        // Pill dismiss passes undefined — do not fall back to Discover's live query.
        esqlQuery,
      });
      closeAll();
    },
    [agentBuilder, closeAll, coreStart.application]
  );

  const onChooseSequence = useCallback(() => {
    closeAll();
    coreStart.application.navigateToApp(OBSERVABILITY_ALERTING_APP_ID, {
      path: `${OBSERVABILITY_ALERTING_RULES_V2_PATH}/sequence/create`,
    });
  }, [closeAll, coreStart.application]);

  const exploreLibrary = useCallback(() => {
    closeAll();
    coreStart.application.navigateToApp(OBSERVABILITY_ALERTING_APP_ID, {
      path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
    });
  }, [closeAll, coreStart.application]);

  const browseClassic = useCallback(
    (search?: string) => {
      // Discover-specific classic types are listed in the chooser body; Browse all opens
      // the full Classic registry (templates + types).
      setClassicInitialSearch(typeof search === 'string' ? search.trim() : '');
      openClassicChooser();
    },
    [openClassicChooser]
  );

  const onSelectClassicRuleType = useCallback(
    (ruleTypeId: string) => {
      const legacyMatch = legacyRuleTypes?.find((item) => item.id === ruleTypeId);
      if (legacyMatch) {
        setLegacyItem(legacyMatch);
        return;
      }
      closeAll();
      coreStart.application.navigateToApp(OBSERVABILITY_ALERTING_APP_ID, {
        path: `${OBSERVABILITY_ALERTING_RULES_V1_PATH}${getCreateRuleRoute(ruleTypeId)}`,
      });
    },
    [closeAll, coreStart.application, legacyRuleTypes]
  );

  const onSelectTemplate = useCallback(
    (templateId: string) => {
      closeAll();
      coreStart.application.navigateToApp(OBSERVABILITY_ALERTING_APP_ID, {
        path: `${OBSERVABILITY_ALERTING_RULES_V1_PATH}${getCreateRuleFromTemplateRoute(
          encodeURIComponent(templateId)
        )}`,
      });
    },
    [closeAll, coreStart.application]
  );

  // Keep the chooser mounted under authoring/Classic so EuiFlyout historyKey
  // stacking provides Back (same pattern as MixedCreateRuleSession).
  return (
    <>
      <MixedCreateRuleFlyout
        onClose={closeAll}
        onChooseThreshold={() => openV2Authoring('threshold')}
        onChooseEsql={() => openV2Authoring('esql')}
        onChooseAgent={onChooseAgent}
        onChooseSequence={onChooseSequence}
        onBrowseClassic={browseClassic}
        onExploreLibrary={exploreLibrary}
        onSelectClassicRuleType={onSelectClassicRuleType}
        onMaximizeChange={setIsFlyoutMaximized}
        showClassic
        discoverQuery={discoverQuery}
        compactAskAnything={prototypeSettings.compactAskAnything}
        idleBuilderPresentation={prototypeSettings.idleBuilderPresentation}
        http={coreStart.http}
        toasts={coreStart.notifications.toasts}
        registeredRuleTypes={triggersActionsUi.ruleTypeRegistry.list()}
        historyKey={historyKey}
      />
      {isClassicChooserOpen ? (
        <MixedClassicRuleTypesFlyout
          onClose={closeClassicChooser}
          onSelectClassicRuleType={onSelectClassicRuleType}
          onSelectTemplate={onSelectTemplate}
          http={coreStart.http}
          toasts={coreStart.notifications.toasts}
          registeredRuleTypes={triggersActionsUi.ruleTypeRegistry.list()}
          historyKey={historyKey}
          initialSearch={classicInitialSearch}
          initialIsMaximized={isFlyoutMaximized}
          onMaximizeChange={setIsFlyoutMaximized}
        />
      ) : null}
      {v2InitialStep ? (
        <DefaultCreateRuleOptionsFlyout
          key={v2InitialStep}
          onClose={closeAuthoring}
          onCreated={handleCreated}
          initialQuery={initialQuery}
          esqlVariables={esqlVariables}
          subscribe={subscribe}
          getQuery={getQuery}
          getEsqlVariables={getEsqlVariables}
          history={history}
          initialStep={v2InitialStep}
          historyKey={historyKey}
        />
      ) : null}
      {legacyItem ? legacyItem.render(closeLegacy) : null}
    </>
  );
};
