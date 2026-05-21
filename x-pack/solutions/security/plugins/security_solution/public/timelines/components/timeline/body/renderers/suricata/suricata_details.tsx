/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

import { NetflowRenderer } from '../netflow';
import { SuricataSignature } from './suricata_signature';
import { SuricataRefs } from './suricata_refs';

export const SuricataDetails = React.memo<{
  data: Ecs;
  scopeId: string;
}>(({ data, scopeId }) => {
  const signature: string | null | undefined = get('suricata.eve.alert.signature[0]', data);
  const signatureId: number | null | undefined = get('suricata.eve.alert.signature_id[0]', data);

  if (signatureId != null && signature != null) {
    return (
      <div css={{ margin: '5px 0' }}>
        <SuricataSignature
          scopeId={scopeId}
          id={data._id}
          signature={signature}
          signatureId={signatureId}
        />
        <SuricataRefs signatureId={signatureId} />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} timelineId={scopeId} />
      </div>
    );
  } else {
    return null;
  }
});

SuricataDetails.displayName = 'SuricataDetails';
