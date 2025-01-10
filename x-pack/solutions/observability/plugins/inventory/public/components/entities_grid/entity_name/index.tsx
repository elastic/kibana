/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import type { InventoryEntity } from '../../../../common/entities';
import { EntityIcon } from '../../entity_icon';
import { useDetailViewRedirect } from '../../../hooks/use_detail_view_redirect';

interface EntityNameProps {
  entity: InventoryEntity;
}

export function EntityName({ entity }: EntityNameProps) {
  const {
    services: { telemetry },
  } = useKibana();

  const { getEntityRedirectUrl } = useDetailViewRedirect();

  const href = getEntityRedirectUrl(entity);

  const handleLinkClick = useCallback(() => {
    telemetry.reportEntityViewClicked({
      view_type: 'detail',
      entity_type: entity.entityType,
    });
  }, [entity, telemetry]);

  const entityName = (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={0}>
        <EntityIcon entity={entity} />
      </EuiFlexItem>
      <EuiFlexItem className="eui-textTruncate">
        <span className="eui-textTruncate" data-test-subj="entityNameDisplayName">
          {entity.entityDisplayName}
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return href ? (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink data-test-subj="entityNameLink" href={href} onClick={handleLinkClick}>
      {entityName}
    </EuiLink>
  ) : (
    entityName
  );
}
