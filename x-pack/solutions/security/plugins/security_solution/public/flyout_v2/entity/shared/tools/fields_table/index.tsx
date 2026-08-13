/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../../../../entity_analytics/components/entity_store/entity_icon_by_type';
import { FieldsTableTab } from '../../../../../cloud_security_posture/components/csp_details/fields_table_tab';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { FIELDS_TABLE_TITLE } from '../../../../shared/constants/flyout_titles';

const TITLE = FIELDS_TABLE_TITLE;

export interface FieldsTableToolProps {
  /** The (flattened) document whose fields are displayed in the table. */
  document: Record<string, unknown>;
  /** localStorage key used to persist pinned fields. */
  tableStorageKey?: string;
  /** Display name of the originating entity (shown in the tool header). */
  entityName: string;
  /** Opens the originating entity flyout as a child. */
  onShowEntity?: () => void;
}

/**
 * Tool flyout displaying the full field table for an entity. Renders the same {@link FieldsTableTab}
 * content as the v1 left panel, opened via `overlays.openSystemFlyout`.
 */
export const FieldsTableTool = memo(
  ({ document, tableStorageKey, entityName, onShowEntity }: FieldsTableToolProps) => (
    <>
      <EuiFlyoutHeader hasBorder>
        <ToolsFlyoutHeader
          title={TITLE}
          onTitleClick={onShowEntity}
          label={entityName}
          iconType={EntityIconByType[EntityType.generic]}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FieldsTableTab document={document} tableStorageKey={tableStorageKey} />
      </EuiFlyoutBody>
    </>
  )
);

FieldsTableTool.displayName = 'FieldsTableTool';
