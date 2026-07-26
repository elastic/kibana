/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiCopy, EuiText, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import type { Cert } from '../../../../../common/runtime_types';
import {
  COPY_FINGERPRINT,
  FINGERPRINT_NOT_AVAILABLE,
  FINGERPRINT_NOT_AVAILABLE_TOOLTIP,
} from './translations';

const StyledSpan = styled.span`
  margin-right: 8px;
`;

interface Props {
  cert: Cert;
}

export const FingerprintCol: React.FC<Props> = ({ cert }) => {
  const ShaComponent = ({ text, val }: { text: string; val: string }) => {
    return (
      <StyledSpan data-test-subj={val} className="eui-textNoWrap">
        <EuiToolTip content={val}>
          <EuiButtonEmpty data-test-subj="syntheticsShaComponentButton" flush="right">
            {text}{' '}
          </EuiButtonEmpty>
        </EuiToolTip>
        <EuiCopy textToCopy={val ?? ''}>
          {(copy) => (
            <EuiToolTip content={COPY_FINGERPRINT} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="syntheticsShaComponentButton"
                aria-label={COPY_FINGERPRINT}
                onClick={copy}
                iconType="copy"
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </StyledSpan>
    );
  };
  if (!cert?.sha1 && !cert?.sha256) {
    return (
      <EuiToolTip content={FINGERPRINT_NOT_AVAILABLE_TOOLTIP}>
        <EuiText size="s" color="subdued" data-test-subj="certFingerprintNotAvailable">
          {FINGERPRINT_NOT_AVAILABLE}
        </EuiText>
      </EuiToolTip>
    );
  }

  return (
    <span>
      {cert?.sha1 && <ShaComponent text="SHA 1" val={cert.sha1.toUpperCase()} />}
      {cert?.sha256 && <ShaComponent text="SHA 256" val={cert.sha256.toUpperCase()} />}
    </span>
  );
};
