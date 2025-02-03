/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import type { UpgradeableThreatMatchFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { KqlQueryEditForm } from './fields/kql_query';
import { DataSourceEditForm } from './fields/data_source';
import { AlertSuppressionEditForm } from './fields/alert_suppression';
import { ThreatMatchIndexEditForm } from './fields/threat_match_index';
import { ThreatMatchQueryEditForm } from './fields/threat_match_query';
import { ThreatMatchMappingEditForm } from './fields/threat_match_mapping';
import { ThreatMatchIndicatorPathEditForm } from './fields/threat_index_indicator_path';

interface ThreatMatchRuleFieldEditProps {
  fieldName: UpgradeableThreatMatchFields;
}

export function ThreatMatchRuleFieldEdit({
  fieldName,
}: ThreatMatchRuleFieldEditProps): JSX.Element | null {
  switch (fieldName) {
    case 'kql_query':
      return <KqlQueryEditForm />;
    case 'data_source':
      return <DataSourceEditForm />;
    case 'alert_suppression':
      return <AlertSuppressionEditForm />;
    case 'threat_index':
      return <ThreatMatchIndexEditForm />;
    case 'threat_query':
      return <ThreatMatchQueryEditForm />;
    case 'threat_mapping':
      return <ThreatMatchMappingEditForm />;
    case 'threat_indicator_path':
      return <ThreatMatchIndicatorPathEditForm />;
    default:
      return assertUnreachable(fieldName);
  }
}
