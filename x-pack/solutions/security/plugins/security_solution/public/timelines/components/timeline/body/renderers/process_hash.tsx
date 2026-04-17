/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { DraggableBadge } from '../../../../../common/components/draggables';

import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';

interface Props {
  contextId: string;
  eventId: string;
  processHashSha256: string | null | undefined;
  scopeId: string;
}

export const ProcessHash = React.memo<Props>(
  ({ contextId, eventId, processHashSha256, scopeId }) => {
    const { euiTheme } = useEuiTheme();

    if (isNillEmptyOrNotFinite(processHashSha256)) {
      return null;
    }

    return (
      <EuiFlexGroup
        alignItems="center"
        direction="column"
        gutterSize="none"
        css={css`
          margin: ${euiTheme.size.xs};
        `}
      >
        <TokensFlexItem grow={false} component="div">
          <DraggableBadge
            scopeId={scopeId}
            contextId={contextId}
            eventId={eventId}
            field="process.hash.sha256"
            iconType="number"
            value={processHashSha256}
            fieldType="keyword"
            isAggregatable={true}
          />
        </TokensFlexItem>
      </EuiFlexGroup>
    );
  }
);

ProcessHash.displayName = 'ProcessHash';
