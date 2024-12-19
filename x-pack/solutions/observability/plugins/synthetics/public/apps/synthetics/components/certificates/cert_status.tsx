/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiHealth, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useCertStatus } from './use_cert_status';
import { CERT_STATUS, DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';
import { Cert } from '../../../../../common/runtime_types';
import * as labels from './translations';

interface Props {
  cert: Cert;
}

export const CertStatus: React.FC<Props> = ({ cert }) => {
  const certStatus = useCertStatus(cert?.not_after, cert?.not_before);

  const relativeDate = moment(cert?.not_after).fromNow();

  if (certStatus === CERT_STATUS.EXPIRING_SOON) {
    return (
      <EuiHealth color="warning">
        <span>
          {labels.EXPIRES_SOON}
          {'  '}
          <EuiText
            color="subdued"
            size="xs"
            css={css`
              display: inline-block;
              margin-left: 5px;
            `}
          >
            {relativeDate}
          </EuiText>
        </span>
      </EuiHealth>
    );
  }
  if (certStatus === CERT_STATUS.EXPIRED) {
    return (
      <EuiHealth color="danger">
        <span>
          {labels.EXPIRED}
          {'  '}
          <EuiText
            css={css`
              display: inline-block;
              margin-left: 5px;
            `}
            color="subdued"
            size="xs"
          >
            {relativeDate}
          </EuiText>
        </span>
      </EuiHealth>
    );
  }

  if (certStatus === CERT_STATUS.TOO_OLD) {
    const ageThreshold = DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold;

    const oldRelativeDate = moment(cert?.not_before).add(ageThreshold, 'days').fromNow();

    return (
      <EuiHealth color="danger">
        <span>
          {labels.TOO_OLD}
          <EuiText
            css={css`
              display: inline-block;
              margin-left: 5px;
            `}
            color="subdued"
            size="xs"
          >
            {oldRelativeDate}
          </EuiText>
        </span>
      </EuiHealth>
    );
  }

  const okRelativeDate = moment(cert?.not_after).fromNow(true);

  return (
    <EuiHealth color="success">
      <span>
        {labels.OK}
        {'  '}
        <EuiText
          css={css`
            display: inline-block;
            margin-left: 5px;
          `}
          color="subdued"
          size="xs"
        >
          <FormattedMessage
            id="xpack.synthetics.certs.status.ok.label"
            defaultMessage=" for {okRelativeDate}"
            description='Denotes an amount of time for which a cert is valid. Example: "OK for 2 days"'
            values={{
              okRelativeDate,
            }}
          />
        </EuiText>
      </span>
    </EuiHealth>
  );
};
