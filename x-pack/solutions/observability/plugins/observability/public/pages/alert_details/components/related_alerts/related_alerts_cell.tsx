/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { EuiText } from '@elastic/eui';
import AlertActions from '../../../../components/alert_actions/alert_actions';
import { RelationCol } from './relation_col';
import { AlertCellRenderers } from '../../../../components/alerts_table/common/cell_value';

export const RELATION_COL = 'relation';
export const RELATED_ACTIONS_COL = 'relatedActions';

export const relatedAlertsRowRenderer: AlertCellRenderers = {
  [RELATION_COL]: (value, props) => {
    return <RelationCol alert={props.alert} parentAlert={props.parentAlert!} />;
  },
  [ALERT_REASON]: (value) => {
    return <EuiText size="s">{value}</EuiText>;
  },
  [RELATED_ACTIONS_COL]: (val, props) => {
    return <AlertActions {...props} />;
  },
};
