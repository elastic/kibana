/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiCopy, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { Cert } from '../../../../../common/runtime_types';
import { COPY_FINGERPRINT } from './translations';

interface Props {
  cert: Cert;
}

export const FingerprintCol: React.FC<Props> = ({ cert }) => {
  const ShaComponent = ({ text, val }: { text: string; val: string }) => {
    return (
      <span
        css={css`
          margin-right: 8px;
        `}
        data-test-subj={val}
        className="eui-textNoWrap"
      >
        <EuiToolTip content={val}>
          <EuiButtonEmpty data-test-subj="syntheticsShaComponentButton" flush="right">
            {text}{' '}
          </EuiButtonEmpty>
        </EuiToolTip>
        <EuiCopy textToCopy={val ?? ''}>
          {(copy) => (
            <EuiButtonIcon
              data-test-subj="syntheticsShaComponentButton"
              aria-label={COPY_FINGERPRINT}
              onClick={copy}
              iconType="copy"
              title={COPY_FINGERPRINT}
            />
          )}
        </EuiCopy>
      </span>
    );
  };
  return (
    <span>
      <ShaComponent text="SHA 1" val={cert?.sha1?.toUpperCase() ?? ''} />
      <ShaComponent text="SHA 256" val={cert?.sha256?.toUpperCase() ?? ''} />
    </span>
  );
};
