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
import { getAnomaliesDetectedEsqlQuery } from './esql_query';
import { KeyInsightsTile } from '../common/key_insights_tile';

export const AnomaliesDetectedTile: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  return (
    <KeyInsightsTile
      title={i18n.translate('xpack.securitySolution.privmon.anomaliesDetected.title', {
        defaultMessage: 'Anomalies detected',
      })}
      label={i18n.translate('xpack.securitySolution.privmon.anomaliesDetected.label', {
        defaultMessage: 'Anomalies detected',
      })}
      getEsqlQuery={(namespace) => right(getAnomaliesDetectedEsqlQuery(namespace))}
      id="privileged-user-monitoring-anomalies-detected"
      spaceId={spaceId}
      inspectTitle={
        <FormattedMessage
          id="xpack.securitySolution.privmon.anomaliesDetected.inspectTitle"
          defaultMessage="Anomalies detected"
        />
      }
    />
  );
};
