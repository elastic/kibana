/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ATTACK_DISCOVERY_AD_HOC_RULE_ID = 'attack_discovery_ad_hoc_rule_id' as const;
export const ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID = 'attack_discovery_ad_hoc_rule_type_id' as const;

export const replaceAnonymizedValuesWithOriginalValues = ({
  messageContent,
  replacements,
}: {
  messageContent: string;
  replacements: Record<string, string> | null | undefined;
}): string =>
  replacements != null
    ? Object.keys(replacements).reduce(
        (acc, key) => acc.replaceAll(key, replacements[key]),
        messageContent
      )
    : messageContent;

export const getOriginalAlertIds = ({
  alertIds,
  replacements,
}: {
  alertIds: string[];
  replacements?: Record<string, string>;
}): string[] =>
  alertIds.map((alertId) => (replacements != null ? replacements[alertId] ?? alertId : alertId));
