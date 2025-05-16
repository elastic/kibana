/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';

import { TableId } from '@kbn/securitysolution-data-table';
import { AiForSOCAlertsTab } from './ai_for_soc/wrapper';
import { useKibana } from '../../../../../../common/lib/kibana';
import { SECURITY_FEATURE_ID } from '../../../../../../../common';
import { DetectionEngineAlertsTable } from '../../../../../../detections/components/alerts_table';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
}

const AlertsTabComponent: React.FC<Props> = ({ attackDiscovery, replacements }) => {
  const {
    application: { capabilities },
  } = useKibana().services;

  // TODO We shouldn't have to check capabilities here, this should be done at a much higher level.
  //  https://github.com/elastic/kibana/issues/218731
  //  For the AI for SOC we need to show the Alert summary page alerts table
  const AIForSOC = capabilities[SECURITY_FEATURE_ID].configurations;

  const originalAlertIds = useMemo(
    () =>
      attackDiscovery.alertIds.map((alertId) =>
        replacements != null ? replacements[alertId] ?? alertId : alertId
      ),
    [attackDiscovery.alertIds, replacements]
  );

  const alertIdsQuery = useMemo(
    () => ({
      ids: {
        values: originalAlertIds,
      },
    }),
    [originalAlertIds]
  );

  const id = useMemo(() => `attack-discovery-alerts-${attackDiscovery.id}`, [attackDiscovery.id]);

  return (
    <div data-test-subj="alertsTab">
      {AIForSOC ? (
        <div data-test-subj="ai4dsoc-alerts-table">
          <AiForSOCAlertsTab id={id} query={alertIdsQuery} />
        </div>
      ) : (
        <div data-test-subj="detection-engine-alerts-table">
          <DetectionEngineAlertsTable
            id={id}
            tableType={TableId.alertsOnCasePage}
            ruleTypeIds={SECURITY_SOLUTION_RULE_TYPE_IDS}
            query={alertIdsQuery}
            showAlertStatusWithFlapping={false}
          />
        </div>
      )}
    </div>
  );
};

AlertsTabComponent.displayName = 'AlertsTab';

export const AlertsTab = React.memo(AlertsTabComponent);
