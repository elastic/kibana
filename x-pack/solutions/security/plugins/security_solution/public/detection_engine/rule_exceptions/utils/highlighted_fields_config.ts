/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The highlightedFieldsPrefixToExclude is an array of prefixes
 * that should be disregarded in the Rule Exception.These prefixes
 * are irrelevant to the exception and should be ignored,even if
 * they were retrieved as Highlighted Fields from the "getEventFieldsToDisplay".
 */
export const highlightedFieldsPrefixToExclude = ['kibana.alert.rule', 'signal.rule', 'rule'];

export const getKibanaAlertIdField = (id: string) => `kibana.alert.${id}`;

export const EVENT_CATEGORY = 'event.category';
export const EVENT_CODE = 'event.code';
export const KIBANA_ALERT_RULE_TYPE = 'kibana.alert.rule.type';
export const AGENT_ID = 'agent.id';
export const AGENT_TYPE = 'agent.type';
export const KIBANA_ALERT_RULE_UUID = 'kibana.alert.rule.uuid';
export const ENDPOINT_ALERT = 'endpoint';
