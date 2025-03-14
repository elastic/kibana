/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { DraggableBadge } from '../../../../../common/components/draggables';

import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';

const HashFlexGroup = styled(EuiFlexGroup)`
  margin: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface Props {
  contextId: string;
  eventId: string;
  fileHashSha256: string | null | undefined;
}

export const FileHash = React.memo<Props>(({ contextId, eventId, fileHashSha256 }) => {
  if (isNillEmptyOrNotFinite(fileHashSha256)) {
    return null;
  }

  return (
    <HashFlexGroup alignItems="center" direction="column" gutterSize="none">
      <TokensFlexItem grow={false} component="div">
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="file.hash.sha256"
          iconType="number"
          value={fileHashSha256}
          isAggregatable={true}
          fieldType="keyword"
        />
      </TokensFlexItem>
    </HashFlexGroup>
  );
});

FileHash.displayName = 'FileHash';
