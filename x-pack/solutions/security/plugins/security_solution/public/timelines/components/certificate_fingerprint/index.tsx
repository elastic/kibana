/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { DraggableBadge } from '../../../common/components/draggables';
import { CertificateFingerprintLink } from '../../../common/components/links';

import * as i18n from './translations';

export type CertificateType = 'client' | 'server';

export const TLS_CLIENT_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME =
  'tls.client_certificate.fingerprint.sha1';
export const TLS_SERVER_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME =
  'tls.server_certificate.fingerprint.sha1';

const FingerprintLabel = styled.span`
  margin-right: 5px;
`;

FingerprintLabel.displayName = 'FingerprintLabel';

/**
 * Represents a field containing a certificate fingerprint (e.g. a sha1), with
 * a link to an external site, which in-turn compares the fingerprint against a
 * set of known fingerprints
 * Examples:
 * 'tls.client_certificate.fingerprint.sha1'
 * 'tls.server_certificate.fingerprint.sha1'
 */
export const CertificateFingerprint = React.memo<{
  eventId: string;
  certificateType: CertificateType;
  contextId: string;
  fieldName: string;
  value?: string | null;
}>(({ eventId, certificateType, contextId, fieldName, value }) => {
  return (
    <DraggableBadge
      contextId={contextId}
      data-test-subj={`${certificateType}-certificate-fingerprint`}
      eventId={eventId}
      field={fieldName}
      iconType="snowflake"
      tooltipContent={
        <EuiText size="xs">
          <span>{fieldName}</span>
        </EuiText>
      }
      value={value}
      isAggregatable={true}
      fieldType="keyword"
    >
      <FingerprintLabel>
        {certificateType === 'client' ? i18n.CLIENT_CERT : i18n.SERVER_CERT}
      </FingerprintLabel>
      <CertificateFingerprintLink certificateFingerprint={value || ''} />
    </DraggableBadge>
  );
});

CertificateFingerprint.displayName = 'CertificateFingerprint';
