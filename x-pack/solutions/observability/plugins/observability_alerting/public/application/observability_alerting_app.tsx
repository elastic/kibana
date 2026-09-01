/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingV2AppMount, AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import type { AppUnmount, CoreStart, ScopedHistory } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { createObservabilityAlertingSetBreadcrumbs } from './breadcrumbs';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

const V1_RULES_APP_ID = 'rules';

const RedirectToPath = ({ to }: { to: string }) => {
  const history = useHistory();

  useEffect(() => {
    history.replace(to);
  }, [history, to]);

  return null;
};

const RedirectToV1Rules = ({ coreStart }: { coreStart: CoreStart }) => {
  useEffect(() => {
    void coreStart.application.navigateToApp(V1_RULES_APP_ID, { replace: true });
  }, [coreStart]);

  return null;
};

const SubAppMount = ({
  basePath,
  coreStart,
  mountFn,
}: {
  basePath: string;
  coreStart: CoreStart;
  mountFn: AlertingV2AppMount;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const history = useHistory() as ScopedHistory;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    let cancelled = false;
    let unmount: AppUnmount | undefined;
    const subHistory = history.createSubHistory(basePath);
    const setBreadcrumbs = createObservabilityAlertingSetBreadcrumbs({
      application: coreStart.application,
      chrome: coreStart.chrome,
      history,
    });

    void mountFn({
      params: {
        element,
        history: subHistory,
        setBreadcrumbs: (crumbs) => setBreadcrumbs(crumbs, subHistory),
      },
      coreStart,
    }).then((nextUnmount) => {
      if (cancelled) {
        nextUnmount();
        return;
      }
      unmount = nextUnmount;
    });

    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [basePath, coreStart, history, mountFn]);

  return <div className={APP_WRAPPER_CLASS} ref={containerRef} />;
};

export const ObservabilityAlertingApp = ({
  alertingVTwo,
  coreStart,
}: {
  alertingVTwo: AlertingV2PublicStart;
  coreStart: CoreStart;
}) => {
  return (
    <Routes>
      <Route exact path="/">
        <RedirectToPath to={OBSERVABILITY_ALERTING_INBOX_PATH} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULES_V1_PATH}>
        <RedirectToV1Rules coreStart={coreStart} />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_INBOX_PATH}>
        <SubAppMount
          basePath={OBSERVABILITY_ALERTING_INBOX_PATH}
          coreStart={coreStart}
          mountFn={alertingVTwo.mountEpisodesApp}
        />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULES_V2_PATH}>
        <SubAppMount
          basePath={OBSERVABILITY_ALERTING_RULES_V2_PATH}
          coreStart={coreStart}
          mountFn={alertingVTwo.mountRulesApp}
        />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH}>
        <SubAppMount
          basePath={OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH}
          coreStart={coreStart}
          mountFn={alertingVTwo.mountRuleLibraryApp}
        />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH}>
        <SubAppMount
          basePath={OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH}
          coreStart={coreStart}
          mountFn={alertingVTwo.mountActionPoliciesApp}
        />
      </Route>
      <Route path={OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH}>
        <SubAppMount
          basePath={OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH}
          coreStart={coreStart}
          mountFn={alertingVTwo.mountExecutionHistoryApp}
        />
      </Route>
      <Route>
        <RedirectToPath to={OBSERVABILITY_ALERTING_INBOX_PATH} />
      </Route>
    </Routes>
  );
};
