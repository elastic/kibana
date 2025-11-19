/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { ALERT_INDEX_PATTERN } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../../../typings/alerts';

export const getAlertsIndexPatternRuleData = ({ alert, rule }: { alert: TopAlert; rule: Rule }) => {
  const indexPattern =
    ALERT_INDEX_PATTERN in alert.fields ? alert.fields[ALERT_INDEX_PATTERN] : undefined;

  if (typeof indexPattern !== 'string') {
    return {};
  }

  const discoverAppLocatorParams: DiscoverAppLocatorParams = {
    dataViewSpec: {
      title: indexPattern,
      timeFieldName: '@timestamp',
    },
  };

  const filterQueryText = rule.params.filterQueryText;
  if (typeof filterQueryText === 'string' && filterQueryText) {
    discoverAppLocatorParams.query = {
      query: filterQueryText,
      language: 'kuery',
    };
  }

  return {
    discoverAppLocatorParams,
  };
};
