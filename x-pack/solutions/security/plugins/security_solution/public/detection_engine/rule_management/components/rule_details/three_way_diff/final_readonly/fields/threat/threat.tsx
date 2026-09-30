/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import * as ruleDetailsI18n from '../../../../translations';
import { Threat, splitThreatsByFramework } from '../../../../rule_about_section';
import { EmptyFieldValuePlaceholder } from '../../empty_field_value_placeholder';

export interface ThreatReadOnlyProps {
  threat: Threats;
}

export const ThreatReadOnly = ({ threat }: ThreatReadOnlyProps) => {
  const { attackThreat, atlasThreat } = splitThreatsByFramework(threat);

  // Always render the ATT&CK row so an empty threat field still shows the placeholder;
  // the ATLAS row only appears when the rule actually has ATLAS mappings.
  const listItems = [
    {
      title: ruleDetailsI18n.THREAT_FIELD_LABEL,
      description: attackThreat.length ? (
        <Threat threat={attackThreat} framework="enterprise" />
      ) : (
        <EmptyFieldValuePlaceholder />
      ),
    },
  ];

  if (atlasThreat.length > 0) {
    listItems.push({
      title: ruleDetailsI18n.ATLAS_THREAT_FIELD_LABEL,
      description: <Threat threat={atlasThreat} framework="atlas" />,
    });
  }

  return <EuiDescriptionList listItems={listItems} />;
};
