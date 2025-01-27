/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { ruleDetailsLocatorID } from '../../common';
import { RULES_PATH } from '../../common/locators/paths';
import { ALL_ALERTS } from '../components/alert_search_bar/constants';
import {
  RULE_DETAILS_ALERTS_TAB,
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_SEARCH_BAR_URL_STORAGE_KEY,
} from '../pages/rule_details/constants';
import type { TabId } from '../pages/rule_details/rule_details';
import type { AlertStatus } from '../../common/typings';

export interface RuleDetailsLocatorParams extends SerializableRecord {
  ruleId: string;
  tabId?: TabId;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  status?: AlertStatus;
}

export const getRuleDetailsPath = (ruleId: string) => {
  return `${RULES_PATH}/${encodeURIComponent(ruleId)}`;
};

export class RuleDetailsLocatorDefinition implements LocatorDefinition<RuleDetailsLocatorParams> {
  public readonly id = ruleDetailsLocatorID;

  public readonly getLocation = async (params: RuleDetailsLocatorParams) => {
    const { ruleId, kuery, rangeTo, tabId, rangeFrom, status } = params;
    const appState: {
      tabId?: TabId;
      rangeFrom?: string;
      rangeTo?: string;
      kuery?: string;
      status?: AlertStatus;
    } = {};

    appState.rangeFrom = rangeFrom || 'now-15m';
    appState.rangeTo = rangeTo || 'now';
    appState.kuery = kuery || '';
    appState.status = status || ALL_ALERTS.status;

    let path = getRuleDetailsPath(ruleId);

    if (tabId === RULE_DETAILS_ALERTS_TAB) {
      path = `${path}?tabId=${tabId}`;
      path = setStateToKbnUrl(
        RULE_DETAILS_SEARCH_BAR_URL_STORAGE_KEY,
        appState,
        { useHash: false, storeInHashQuery: false },
        path
      );
    } else if (tabId === RULE_DETAILS_EXECUTION_TAB) {
      path = `${path}?tabId=${tabId}`;
    }

    return {
      app: 'observability',
      path,
      state: {},
    };
  };
}
