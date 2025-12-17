/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { getSLOLinkData } from './get_link_data/get_slo_link_data';
import { useKibana } from '../../utils/kibana_react';

type ViewLinkedObjectSupportedRuleType = (typeof viewLinkedObjectSupportedRuleTypes)[number];

interface Props {
  rule?: Rule;
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
  ViewLinkedObjectSupportedRuleType,
  (rule: Rule) => {
    urlParams: SerializableRecord | undefined;
    buttonText: string;
    locatorId: string;
  }
> = {
  [SLO_BURN_RATE_RULE_TYPE_ID]: getSLOLinkData,
};

export function useAppLink({ rule }: Props) {
  const { services } = useKibana();
  const {
    share: {
      url: { locators },
    },
  } = services;
  const { urlParams, buttonText, locatorId } = isViewLinkedObjectSupportedRuleType(rule?.ruleTypeId)
    ? getLocatorParamsMap[rule.ruleTypeId](rule)
    : { urlParams: undefined, buttonText: '', locatorId: '' };

  const locator = locators.get(locatorId);

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
