/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_TAGS,
  ALERT_RULE_UUID,
  ALERT_RULE_NAME,
} from '@kbn/rule-data-utils';
import { intersection } from 'lodash';
import { EuiDescriptionList, EuiLink } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import type { TopAlert } from '../../../..';
import { getAlertFieldValue } from '../../../../components/alerts_table/common/cell_value';
import { paths } from '../../../../../common/locators/paths';
import { useKibana } from '../../../../utils/kibana_react';

export function RelationCol({ alert, parentAlert }: { alert: Alert; parentAlert: TopAlert }) {
  const {
    services: { http },
  } = useKibana();
  const instanceId = getAlertFieldValue(alert, ALERT_INSTANCE_ID);
  const tags = getAlertFieldValue(alert, ALERT_RULE_TAGS);
  const ruleId = getAlertFieldValue(alert, ALERT_RULE_UUID);
  const ruleName = getAlertFieldValue(alert, ALERT_RULE_NAME);
  const ruleLink = ruleId ? http.basePath.prepend(paths.observability.ruleDetails(ruleId)) : '';
  const hasSomeRelationWithInstance =
    intersection(parentAlert.fields[ALERT_INSTANCE_ID].split(','), instanceId.split(',')).length >
    0;
  const hasSomeRelationWithTags =
    intersection(parentAlert.fields[ALERT_RULE_TAGS], tags.split(',')).length > 0;
  const hasRelationWithRule = ruleId === parentAlert.fields[ALERT_RULE_UUID];
  const relations = [];
  if (hasSomeRelationWithInstance) {
    relations.push({
      title: i18n.translate('xpack.observability.columns.groupsBadgeLabel', {
        defaultMessage: 'Groups',
      }),
      description: instanceId,
    });
  }
  if (hasSomeRelationWithTags) {
    relations.push({
      title: i18n.translate('xpack.observability.columns.tagsBadgeLabel', {
        defaultMessage: 'Tags',
      }),
      description: (
        <TagsList tags={(alert[ALERT_RULE_TAGS] as string[]) || []} ignoreEmpty color="default" />
      ),
    });
  }
  if (hasRelationWithRule) {
    relations.push({
      title: i18n.translate('xpack.observability.columns.ruleBadgeLabel', {
        defaultMessage: 'Rule',
      }),
      description: (
        <EuiLink href={ruleLink} data-test-subj="obsAlertDetailsRelatedAlertsRelationRuleLink">
          {ruleName}
        </EuiLink>
      ),
    });
  }
  return (
    <EuiDescriptionList
      type="column"
      listItems={relations}
      css={{ maxWidth: '400px' }}
      compressed
    />
  );
}
