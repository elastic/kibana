/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { getSLOLinkData } from './get_link_data/get_slo_link_data';

type ViewLinkedObjectSupportedRuleType = (typeof viewLinkedObjectSupportedRuleTypes)[number];

interface Props {
  rule?: Rule;
  locator?: LocatorPublic<SerializableRecord>;
}

const viewLinkedObjectSupportedRuleTypes = [SLO_BURN_RATE_RULE_TYPE_ID] as const;

const isViewLinkedObjectSupportedRuleType = (
  ruleTypeId?: string
): ruleTypeId is ViewLinkedObjectSupportedRuleType => {
  return (
    ruleTypeId !== undefined &&
    Object.values<string>(viewLinkedObjectSupportedRuleTypes).includes(ruleTypeId)
  );
};

const getLocatorParamsMap: Record<
  (typeof viewLinkedObjectSupportedRuleTypes)[number],
  (rule: Rule) => { urlParams: SerializableRecord | undefined; buttonText: string }
> = {
  [SLO_BURN_RATE_RULE_TYPE_ID]: getSLOLinkData,
};

export function useAppLink({ rule, locator }: Props) {
  const { urlParams, buttonText } = isViewLinkedObjectSupportedRuleType(rule?.ruleTypeId)
    ? getLocatorParamsMap[rule.ruleTypeId](rule)
    : { urlParams: undefined, buttonText: '' };

  if (urlParams && locator) {
    return {
      linkUrl: locator.getRedirectUrl(urlParams),
      buttonText,
    };
  }

  return {
    linkUrl: null,
    buttonText: '',
  };
}
