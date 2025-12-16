/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { GoogleLink } from '../../../../../../common/components/links';
import { CellActionsRenderer } from '../../../../../../common/components/cell_actions/cell_actions_renderer';
import { TokensFlexItem } from '../helpers';
import { getBeginningTokens } from './suricata_links';

export const SURICATA_SIGNATURE_FIELD_NAME = 'suricata.eve.alert.signature';
export const SURICATA_SIGNATURE_ID_FIELD_NAME = 'suricata.eve.alert.signature_id';

const SignatureFlexItem = styled(EuiFlexItem)`
  min-width: 77px;
`;

SignatureFlexItem.displayName = 'SignatureFlexItem';

const Badge = styled(EuiBadge)`
  vertical-align: top;
` as unknown as typeof EuiBadge;

Badge.displayName = 'Badge';

const LinkFlexItem = styled(EuiFlexItem)`
  margin-left: 6px;
`;

LinkFlexItem.displayName = 'LinkFlexItem';

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
    <SignatureFlexItem grow={false}>
      <CellActionsRenderer
        field={SURICATA_SIGNATURE_ID_FIELD_NAME}
        value={signatureId}
        scopeId={scopeId}
      >
        <Badge iconType="number" color="hollow" title="">
          {signatureId}
        </Badge>
      </CellActionsRenderer>
    </SignatureFlexItem>
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
      <LinkFlexItem grow={false}>
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
      </LinkFlexItem>
    </EuiFlexGroup>
  );
});

SuricataSignature.displayName = 'SuricataSignature';
