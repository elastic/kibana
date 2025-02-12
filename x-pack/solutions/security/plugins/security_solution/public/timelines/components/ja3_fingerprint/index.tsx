/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { DraggableBadge } from '../../../common/components/draggables';
import { Ja3FingerprintLink } from '../../../common/components/links';

import * as i18n from './translations';

export const JA3_HASH_FIELD_NAME = 'tls.fingerprints.ja3.hash';

const Ja3FingerprintLabel = styled.span`
  margin-right: 5px;
`;

Ja3FingerprintLabel.displayName = 'Ja3FingerprintLabel';

/**
 * Renders a ja3 fingerprint, which enables (some) clients and servers communicating
 * using TLS traffic to be identified, which is possible because SSL
 * negotiations happen in the clear
 */
export const Ja3Fingerprint = React.memo<{
  eventId: string;
  contextId: string;
  fieldName: string;
  value?: string | null;
}>(({ contextId, eventId, fieldName, value }) => (
  <DraggableBadge
    contextId={contextId}
    data-test-subj="ja3-hash"
    eventId={eventId}
    field={fieldName}
    iconType="snowflake"
    value={value}
    isAggregatable={true}
    fieldType="keyword"
  >
    <Ja3FingerprintLabel>{i18n.JA3_FINGERPRINT_LABEL}</Ja3FingerprintLabel>
    <Ja3FingerprintLink data-test-subj="ja3-hash-link" ja3Fingerprint={value || ''} />
  </DraggableBadge>
));

Ja3Fingerprint.displayName = 'Ja3Fingerprint';
