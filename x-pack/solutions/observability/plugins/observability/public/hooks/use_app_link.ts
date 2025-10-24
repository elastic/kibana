/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useKibana } from '../utils/kibana_react';
import { sloDetailsLocatorID } from '..';

interface Props {
  rule?: Rule;
}

export function useAppLink({ rule }: Props) {
  const {
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const linkMap: Record<string, () => void> = {
    [SLO_BURN_RATE_RULE_TYPE_ID]: () =>
      locators.get(sloDetailsLocatorID)?.navigate({ sloId: rule?.params.sloId as string }),
    empty: () => {},
  };

  const navigate = rule?.ruleTypeId ? linkMap[rule.ruleTypeId] : linkMap.empty;

  return {
    navigateToLinkedApp: navigate,
  };
}
