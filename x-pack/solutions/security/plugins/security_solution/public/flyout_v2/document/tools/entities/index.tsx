/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ToolsFlyoutHeader } from '../../../shared/components/tools_flyout_header';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { EntitiesDetailsView } from './components/entities_details_view';

const TITLE = i18n.translate('xpack.securitySolution.flyout.entities.title', {
  defaultMessage: 'Entities',
});

export const ENTITIES_TAB_ID = 'entity';

export interface EntitiesDetailsProps {
  hit: DataTableRecord;
  scopeId: string;
  renderCellActions: CellActionRenderer;
}

export const EntitiesDetails = memo(({ hit, scopeId, renderCellActions }: EntitiesDetailsProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
      >
        <ToolsFlyoutHeader hit={hit} title={TITLE} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EntitiesDetailsView hit={hit} scopeId={scopeId} renderCellActions={renderCellActions} />
      </EuiFlyoutBody>
    </>
  );
});

EntitiesDetails.displayName = 'EntitiesDetails';
