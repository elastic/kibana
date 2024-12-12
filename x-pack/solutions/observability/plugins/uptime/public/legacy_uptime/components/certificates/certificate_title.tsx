/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector } from 'react-redux';
import { certificatesSelector } from '../../state/certificates/certificates';

export const CertificateTitle = () => {
  const total = useSelector(certificatesSelector);

  return (
    <FormattedMessage
      id="xpack.uptime.certificates.heading"
      defaultMessage="TLS Certificates ({total})"
      values={{
        total: <span data-test-subj="uptimeCertTotal">{total ?? 0}</span>,
      }}
    />
  );
};
