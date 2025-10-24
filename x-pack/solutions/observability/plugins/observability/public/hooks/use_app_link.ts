/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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

  const linkMap: Record<string, { navigateToLinkedApp: () => void; buttonText: string }> = {
    [SLO_BURN_RATE_RULE_TYPE_ID]: {
      navigateToLinkedApp: () =>
        locators.get(sloDetailsLocatorID)?.navigate({ sloId: rule?.params.sloId as string }),
      buttonText: i18n.translate('xpack.observability.ruleDetails.viewLinkedSLOButton', {
        defaultMessage: 'View linked SLO',
      }),
    },
  };

  return rule?.ruleTypeId ? linkMap[rule.ruleTypeId] : undefined;
}
