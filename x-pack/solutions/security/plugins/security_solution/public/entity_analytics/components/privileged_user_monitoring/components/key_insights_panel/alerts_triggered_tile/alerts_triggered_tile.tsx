/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { right } from 'fp-ts/Either';
import { i18n } from '@kbn/i18n';
import { getAlertsTriggeredEsqlCount } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';
import { useSignalIndex } from '../../../../../../detections/containers/detection_engine/alerts/use_signal_index';

export const AlertsTriggeredTile: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { signalIndexName: alertsIndexName } = useSignalIndex();
  return (
    <KeyInsightsTile
      title={i18n.translate('xpack.securitySolution.privmon.alertsTriggered.title', {
        defaultMessage: 'Alerts triggered',
      })}
      label={i18n.translate('xpack.securitySolution.privmon.alertsTriggered.label', {
        defaultMessage: 'Alerts triggered',
      })}
      getEsqlQuery={(namespace) => right(getAlertsTriggeredEsqlCount(namespace, alertsIndexName))}
      id="privileged-user-monitoring-alerts-triggered"
      spaceId={spaceId}
      inspectTitle={
        <FormattedMessage
          id="xpack.securitySolution.privmon.alertsTriggered.inspectTitle"
          defaultMessage="Alerts triggered"
        />
      }
    />
  );
};
