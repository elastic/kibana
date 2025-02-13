/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatMatchIndicatorPathEdit } from '../../../../../../../rule_creation/components/threat_match_indicator_path_edit';

export function ThreatMatchIndicatorPathEditAdapter(): JSX.Element {
  return <ThreatMatchIndicatorPathEdit path="threat_indicator_path" />;
}
