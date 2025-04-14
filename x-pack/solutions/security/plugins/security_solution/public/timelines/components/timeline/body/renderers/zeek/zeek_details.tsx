/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

import { NetflowRenderer } from '../netflow';
import { ZeekSignature } from './zeek_signature';

const Details = styled.div`
  margin: 5px 0;
`;

Details.displayName = 'Details';

interface ZeekDetailsProps {
  data: Ecs;
  timelineId: string;
}

export const ZeekDetails = React.memo<ZeekDetailsProps>(({ data, timelineId }) =>
  data.zeek != null ? (
    <Details>
      <ZeekSignature data={data} timelineId={timelineId} />
      <EuiSpacer size="s" />
      <NetflowRenderer data={data} timelineId={timelineId} />
    </Details>
  ) : null
);

ZeekDetails.displayName = 'ZeekDetails';
