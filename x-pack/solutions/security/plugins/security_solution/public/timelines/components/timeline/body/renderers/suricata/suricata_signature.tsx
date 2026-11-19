/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { GoogleLink } from '../../../../../../common/components/links';
import { CellActionsRenderer } from '../../../../../../common/components/cell_actions/cell_actions_renderer';
import { TokensFlexItem } from '../helpers';
import { getBeginningTokens } from './suricata_links';

export const SURICATA_SIGNATURE_FIELD_NAME = 'suricata.eve.alert.signature';
export const SURICATA_SIGNATURE_ID_FIELD_NAME = 'suricata.eve.alert.signature_id';

export const Tokens = React.memo<{ tokens: string[] }>(({ tokens }) => (
  <>
    {tokens.map((token) => (
      <TokensFlexItem key={token} grow={false}>
        <EuiBadge iconType="tag" color="hollow" title="">
          {token}
        </EuiBadge>
      </TokensFlexItem>
    ))}
  </>
));

Tokens.displayName = 'Tokens';

export const SignatureId = React.memo<{
  scopeId: string;
  signatureId: number;
}>(({ scopeId, signatureId }) => {
  return (
    <EuiFlexItem grow={false} css={{ minWidth: '77px' }}>
      <CellActionsRenderer
        field={SURICATA_SIGNATURE_ID_FIELD_NAME}
        value={signatureId}
        scopeId={scopeId}
      >
        <EuiBadge iconType="number" color="hollow" title="" css={{ verticalAlign: 'top' }}>
          {signatureId}
        </EuiBadge>
      </CellActionsRenderer>
    </EuiFlexItem>
  );
});

SignatureId.displayName = 'SignatureId';

export const SuricataSignature = React.memo<{
  scopeId: string;
  id: string;
  signature: string;
  signatureId: number;
}>(({ scopeId, id, signature, signatureId }) => {
  const tokens = getBeginningTokens(signature);
  return (
    <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
      <SignatureId scopeId={scopeId} signatureId={signatureId} />
      <Tokens tokens={tokens} />
      <EuiFlexItem grow={false} css={{ marginLeft: '6px' }}>
        <CellActionsRenderer
          data-test-subj="signature-link"
          field={SURICATA_SIGNATURE_FIELD_NAME}
          value={signature}
          tooltipPosition="bottom"
          scopeId={scopeId}
        >
          <div>
            <GoogleLink link={signature}>
              {signature.split(' ').splice(tokens.length).join(' ')}
            </GoogleLink>
          </div>
        </CellActionsRenderer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SuricataSignature.displayName = 'SuricataSignature';
