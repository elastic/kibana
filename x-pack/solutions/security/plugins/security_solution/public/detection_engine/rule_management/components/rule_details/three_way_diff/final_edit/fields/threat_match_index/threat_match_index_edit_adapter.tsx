/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatMatchIndexEdit } from '../../../../../../../rule_creation/components/threat_match_index_edit';

export function ThreatMatchIndexEditAdapter(): JSX.Element {
  return <ThreatMatchIndexEdit path="threat_index" />;
}
