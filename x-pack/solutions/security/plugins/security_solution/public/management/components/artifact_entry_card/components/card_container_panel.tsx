/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import { EuiPanel } from '@elastic/eui';
import type { EuiPanelProps } from '@elastic/eui/src/components/panel/panel';
import React, { memo, useMemo } from 'react';
import type { MaybeImmutable } from '../../../../../common/endpoint/types';
import { CardArtifactProvider } from './card_artifact_context';
import type { AnyArtifact } from '..';

export const EuiPanelStyled = styled(EuiPanel)`
  &.artifactEntryCard + &.artifactEntryCard {
    margin-top: ${({ theme }) => theme.euiTheme.size.l};
  }
`;

export type CardContainerPanelProps = Exclude<EuiPanelProps, 'hasBorder' | 'paddingSize'> & {
  item: MaybeImmutable<AnyArtifact>;
};

export const CardContainerPanel = memo<CardContainerPanelProps>(
  ({ className, item, children, ...props }) => {
    const dataArtifactItemId = useMemo(() => {
      return 'item_id' in item ? item.item_id : undefined;
    }, [item]);

    return (
      <EuiPanelStyled
        {...props}
        hasBorder={true}
        paddingSize="none"
        className={`artifactEntryCard ${className ?? ''}`}
        data-artifact-item-id={dataArtifactItemId}
        data-test-subj={props['data-test-subj']}
      >
        <CardArtifactProvider item={item}>{children}</CardArtifactProvider>
      </EuiPanelStyled>
    );
  }
);

CardContainerPanel.displayName = 'CardContainerPanel';
