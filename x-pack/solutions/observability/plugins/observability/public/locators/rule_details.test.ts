/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_NAME, ALERT_STATUS } from '@kbn/rule-data-utils';
import {
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_ALERTS_TAB,
} from '../pages/rule_details/constants';
import { getRuleDetailsPath, RuleDetailsLocatorDefinition } from './rule_details';
import { RULES_PATH } from '../../common/locators/paths';

describe('RuleDetailsLocator', () => {
  const locator = new RuleDetailsLocatorDefinition();
  const mockedRuleId = '389d3318-7e10-4996-bb45-128e1607fb7e';

  it('should return correct url when only ruleId is provided', async () => {
    const location = await locator.getLocation({ ruleId: mockedRuleId });
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(getRuleDetailsPath(mockedRuleId));
  });

  it('should return correct url when tabId is execution', async () => {
    const location = await locator.getLocation({
      ruleId: mockedRuleId,
      tabId: RULE_DETAILS_EXECUTION_TAB,
    });
    expect(location.path).toEqual(`${RULES_PATH}/${mockedRuleId}?tabId=execution`);
  });

  it('should return correct url when tabId is alerts without extra search params', async () => {
    const location = await locator.getLocation({
      ruleId: mockedRuleId,
      tabId: RULE_DETAILS_ALERTS_TAB,
    });
    expect(location.path).toEqual(
      `${RULES_PATH}/${mockedRuleId}?tabId=alerts&searchBarParams=(` +
        `controlConfigs:!((display_settings:(hide_action_bar:!t,hide_exists:!t),field_name:kibana.alert.status,persist:!t,selected_options:!(active),title:Status),(display_settings:(hide_exists:!t),field_name:kibana.alert.rule.name,title:Rule),(field_name:kibana.alert.group.value,title:Group),(field_name:tags,title:Tags)),kuery:'',rangeFrom:now-15m,rangeTo:now)`
    );
  });

  it('should return correct url when tabId is alerts with search params', async () => {
    const location = await locator.getLocation({
      ruleId: mockedRuleId,
      tabId: RULE_DETAILS_ALERTS_TAB,
      rangeFrom: 'mockedRangeTo',
      rangeTo: 'mockedRangeFrom',
      kuery: 'mockedKuery',
    });
    expect(location.path).toEqual(
      `${RULES_PATH}/${mockedRuleId}?tabId=alerts&searchBarParams=(` +
        `controlConfigs:!((display_settings:(hide_action_bar:!t,hide_exists:!t),field_name:kibana.alert.status,persist:!t,selected_options:!(active),title:Status),(display_settings:(hide_exists:!t),field_name:kibana.alert.rule.name,title:Rule),(field_name:kibana.alert.group.value,title:Group),(field_name:tags,title:Tags)),kuery:mockedKuery,rangeFrom:mockedRangeTo,rangeTo:mockedRangeFrom)`
    );
  });

  it('should return correct url when controlConfigs is provided', async () => {
    const mockedControlConfigs = [
      {
        title: 'Status',
        field_name: ALERT_STATUS,
        selected_options: ['untracked'],
        display_settings: {
          hide_action_bar: true,
          hide_exists: true,
        },
        persist: true,
      },
      {
        title: 'Rule',
        field_name: ALERT_RULE_NAME,
        display_settings: {
          hide_exists: true,
        },
      },
      {
        title: 'Group',
        field_name: 'kibana.alert.group.value',
      },
      {
        title: 'Tags',
        field_name: 'tags',
      },
    ];
    const location = await locator.getLocation({
      ruleId: mockedRuleId,
      tabId: RULE_DETAILS_ALERTS_TAB,
      rangeFrom: 'mockedRangeTo',
      rangeTo: 'mockedRangeFrom',
      kuery: 'mockedKuery',
      controlConfigs: mockedControlConfigs,
    });
    expect(location.path).toEqual(
      `${RULES_PATH}/${mockedRuleId}?tabId=alerts&searchBarParams=(` +
        `controlConfigs:!((display_settings:(hide_action_bar:!t,hide_exists:!t),field_name:kibana.alert.status,persist:!t,selected_options:!(untracked)` +
        `,title:Status),(display_settings:(hide_exists:!t),field_name:kibana.alert.rule.name,title:Rule),(field_name:kibana.alert.group.value,title:Group)` +
        `,(field_name:tags,title:Tags)),kuery:mockedKuery,rangeFrom:mockedRangeTo,rangeTo:mockedRangeFrom)`
    );
  });
});
