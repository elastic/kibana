/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import type { EntityType } from '@kbn/entity-store/public';
import type { EntityType as SecurityEntityType } from '../../../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../../../../entity_analytics/components/entity_store/entity_icon_by_type';
import { ResolutionGroupTab } from '../../../../../entity_analytics/components/entity_resolution/resolution_group_tab';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { RESOLUTION_TITLE } from '../../../../shared/constants/flyout_titles';

const TITLE = RESOLUTION_TITLE;

export interface ResolutionProps {
  /** Canonical Entity Store v2 id (`entity.id`) of the entity to resolve. */
  entityId: string;
  /** Entity type used for the resolution group query and related-entity navigation. */
  entityType: EntityType;
  /** Display name of the originating entity (shown in the tool header). */
  entityName: string;
  /** Scope id for downstream containers and queries. */
  scopeId: string;
  /** Opens the originating entity flyout as a child. */
  onShowEntity?: () => void;
  /** Opens a related entity flyout as a child (used instead of the legacy expandable flyout). */
  onShowRelatedEntity?: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
}

/**
 * Tool flyout displaying the entity resolution group for an entity. Renders the same
 * {@link ResolutionGroupTab} content as the v1 left panel, but related-entity clicks open as
 * separate system flyouts via `onShowRelatedEntity` rather than the expandable flyout API.
 */
export const Resolution = memo(
  ({
    entityId,
    entityType,
    entityName,
    scopeId,
    onShowEntity,
    onShowRelatedEntity,
  }: ResolutionProps) => (
    <>
      <EuiFlyoutHeader hasBorder>
        <ToolsFlyoutHeader
          title={TITLE}
          onTitleClick={onShowEntity}
          label={entityName}
          iconType={EntityIconByType[entityType as SecurityEntityType]}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ResolutionGroupTab
          entityId={entityId}
          entityType={entityType}
          scopeId={scopeId}
          onShowEntity={onShowRelatedEntity}
        />
      </EuiFlyoutBody>
    </>
  )
);

Resolution.displayName = 'Resolution';
