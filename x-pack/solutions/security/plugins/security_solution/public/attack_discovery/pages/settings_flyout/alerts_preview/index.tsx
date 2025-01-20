/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { css } from '@emotion/react';
import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import React, { useMemo } from 'react';
import * as uuid from 'uuid';

import { ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';

interface Props {
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  size: number;
}

const configId = ALERTS_TABLE_REGISTRY_CONFIG_IDS.RULE_DETAILS; // show the same row-actions as in the case view

const AlertsPreviewComponent: React.FC<Props> = ({ query, size }) => {
  const { triggersActionsUi } = useKibana().services;

  const alertStateProps = useMemo(
    () => ({
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: configId,
      consumers: [AlertConsumers.SIEM],
      id: `attack-discovery-alerts-preview-${uuid.v4()}`,
      initialPageSize: size,
      query,
      ruleTypeIds: SECURITY_SOLUTION_RULE_TYPE_IDS,
      showAlertStatusWithFlapping: false,
    }),
    [query, size, triggersActionsUi.alertsTableConfigurationRegistry]
  );

  return (
    <div
      css={css`
        width: 100%;
      `}
      data-test-subj="alertsPreview"
    >
      {triggersActionsUi.getAlertsStateTable(alertStateProps)}
    </div>
  );
};

export const AlertsPreview = React.memo(AlertsPreviewComponent);
