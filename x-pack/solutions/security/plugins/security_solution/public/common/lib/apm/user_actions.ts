/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID } from '../../../../common/constants';

export const SINGLE_RULE_ACTIONS = {
  ENABLE: `${APP_UI_ID} singleRuleActions enable`,
  DISABLE: `${APP_UI_ID} singleRuleActions disable`,
  DUPLICATE: `${APP_UI_ID} singleRuleActions duplicate`,
  EXPORT: `${APP_UI_ID} singleRuleActions export`,
  DELETE: `${APP_UI_ID} singleRuleActions delete`,
  MANUAL_RULE_RUN: `${APP_UI_ID} singleRuleActions manual rule run`,
  PREVIEW: `${APP_UI_ID} singleRuleActions preview`,
  SAVE: `${APP_UI_ID} singleRuleActions save`,
};

export const BULK_RULE_ACTIONS = {
  ENABLE: `${APP_UI_ID} bulkRuleActions enable`,
  DISABLE: `${APP_UI_ID} bulkRuleActions disable`,
  DUPLICATE: `${APP_UI_ID} bulkRuleActions duplicate`,
  EXPORT: `${APP_UI_ID} bulkRuleActions export`,
  MANUAL_RULE_RUN: `${APP_UI_ID} bulkRuleActions manual rule run`,
  DELETE: `${APP_UI_ID} bulkRuleActions delete`,
  EDIT: `${APP_UI_ID} bulkRuleActions edit`,
};

export const RULES_TABLE_ACTIONS = {
  REFRESH: `${APP_UI_ID} rulesTable refresh`,
  FILTER: `${APP_UI_ID} rulesTable filter`,
  LOAD_PREBUILT: `${APP_UI_ID} rulesTable loadPrebuilt`,
};

export const TIMELINE_ACTIONS = {
  SAVE: `${APP_UI_ID} timeline save`,
  DUPLICATE: `${APP_UI_ID} timeline duplicate`, // it includes duplicate template, create template from timeline and create timeline from template
  DELETE: `${APP_UI_ID} timeline delete`,
  BULK_DELETE: `${APP_UI_ID} timeline bulkDelete`,
};

export const ALERTS_ACTIONS = {
  OPEN_ANALYZER: `${APP_UI_ID} alerts openAnalyzer`,
  OPEN_SESSION_VIEW: `${APP_UI_ID} alerts openSessionView`,
  INVESTIGATE_IN_TIMELINE: `${APP_UI_ID} alerts investigateInTimeline`,
};

export const FIELD_BROWSER_ACTIONS = {
  FIELD_SAVED: `${APP_UI_ID} fieldBrowser fieldSaved`,
  FIELD_DELETED: `${APP_UI_ID} fieldBrowser fieldDeleted`,
};
