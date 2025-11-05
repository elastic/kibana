/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { sloDetailsLocatorID } from '../../..';

const getSLOLinkData = (rule: Rule) => {
  return typeof rule.params.sloId === 'string'
    ? {
        urlParams: { sloId: rule.params.sloId },
        buttonText: i18n.translate('xpack.observability.ruleDetails.viewLinkedSLOButton', {
          defaultMessage: 'View linked SLO',
        }),
        locatorId: sloDetailsLocatorID,
      }
    : { urlParams: undefined, buttonText: '', locatorId: '' };
};

export { getSLOLinkData };
