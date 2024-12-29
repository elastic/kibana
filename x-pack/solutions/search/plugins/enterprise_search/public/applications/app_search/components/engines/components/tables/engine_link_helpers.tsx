/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink } from '@elastic/eui';

import { KibanaLogic } from '../../../../../shared/kibana';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../../../shared/telemetry';
import { ENGINE_PATH } from '../../../../routes';
import { generateEncodedPath } from '../../../../utils/encode_path_params';
import { FormattedDateTime } from '../../../../utils/formatted_date_time';

const sendEngineTableLinkClickTelemetry = () => {
  TelemetryLogic.actions.sendAppSearchTelemetry({
    action: 'clicked',
    metric: 'engine_table_link',
  });
};

export const navigateToEngine = (engineName: string) => {
  sendEngineTableLinkClickTelemetry();
  KibanaLogic.values.navigateToUrl(generateEncodedPath(ENGINE_PATH, { engineName }));
};

export const renderEngineLink = (engineName: string) => (
  <EuiLinkTo
    to={generateEncodedPath(ENGINE_PATH, { engineName })}
    onClick={sendEngineTableLinkClickTelemetry}
    data-test-subj="EngineName"
  >
    {engineName}
  </EuiLinkTo>
);

export const renderLastChangeLink = (dateString: string, onClick = () => {}) => (
  <EuiLink onClick={onClick}>
    {!dateString ? '-' : <FormattedDateTime date={new Date(dateString)} hideTime />}
  </EuiLink>
);
