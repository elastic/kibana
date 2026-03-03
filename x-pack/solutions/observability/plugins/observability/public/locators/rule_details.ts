/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { DEFAULT_CONTROLS } from '@kbn/alerts-ui-shared/src/alert_filter_controls/constants';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { ruleDetailsLocatorID } from '@kbn/deeplinks-observability';
import { RULES_PATH } from '../../common/locators/paths';
import {
  RULE_DETAILS_ALERTS_TAB,
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_SEARCH_BAR_URL_STORAGE_KEY,
} from '../pages/rule_details/constants';
import type { TabId } from '../pages/rule_details/rule_details';

type RuleDetailsControlConfigs = Array<Omit<FilterControlConfig, 'sort'>>;
export interface RuleDetailsLocatorParams extends SerializableRecord {
  ruleId: string;
  tabId?: TabId;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  controlConfigs?: RuleDetailsControlConfigs;
}

export const getRuleDetailsPath = (ruleId: string) => {
  return `${RULES_PATH}/${encodeURIComponent(ruleId)}`;
};

export class RuleDetailsLocatorDefinition implements LocatorDefinition<RuleDetailsLocatorParams> {
  public readonly id = ruleDetailsLocatorID;

  public readonly getLocation = async (params: RuleDetailsLocatorParams) => {
    const { controlConfigs, ruleId, kuery, rangeTo, tabId, rangeFrom } = params;
    const appState: {
      tabId?: TabId;
      rangeFrom?: string;
      rangeTo?: string;
      kuery?: string;
      controlConfigs?: FilterControlConfig[];
    } = {};

    appState.rangeFrom = rangeFrom || 'now-15m';
    appState.rangeTo = rangeTo || 'now';
    appState.kuery = kuery || '';
    appState.controlConfigs = controlConfigs ?? DEFAULT_CONTROLS;

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
