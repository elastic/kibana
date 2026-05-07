/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { ToolsFlyoutHeader } from '../shared/components/tools_flyout_header';
import { getField } from '../../flyout/document_details/shared/utils';
import { EntitiesDetailsView } from './components/entities_details_view';
import { HostDetailsView } from './components/host_details_view';
import { UserDetailsView } from './components/user_details_view';

const ENTITIES_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.title', {
  defaultMessage: 'Entities',
});
const HOST_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.hostTitle', {
  defaultMessage: 'Host details',
});
const USER_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.userTitle', {
  defaultMessage: 'User details',
});

export interface EntitiesDetailsProps {
  /**
   * Alert/event document.
   */
  hit: DataTableRecord;
  /**
   * Scope id used by cell actions and entity drill-ins.
   */
  scopeId: string;
}

export interface HostEntityDetailsProps extends EntitiesDetailsProps {
  /**
   * Display name from the source document.
   */
  hostName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
}

export interface UserEntityDetailsProps extends EntitiesDetailsProps {
  /**
   * Display name from the source document.
   */
  userName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
}

const FlyoutShell = memo(
  ({ hit, title, children }: React.PropsWithChildren<{ hit: DataTableRecord; title: string }>) => {
    const { euiTheme } = useEuiTheme();

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <ToolsFlyoutHeader hit={hit} title={title} />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{children}</EuiFlyoutBody>
      </>
    );
  }
);

FlyoutShell.displayName = 'EntitiesFlyoutShell';

/**
 * Entities flyout: header + body shell wrapping the reusable details view.
 */
export const EntitiesDetails = memo(({ hit, scopeId }: EntitiesDetailsProps) => (
  <FlyoutShell hit={hit} title={ENTITIES_TITLE}>
    <EntitiesDetailsView hit={hit} scopeId={scopeId} />
  </FlyoutShell>
));

EntitiesDetails.displayName = 'EntitiesDetails';

/**
 * Host details flyout opened from the entity overview.
 */
export const HostEntityDetails = memo(
  ({ hit, hostName, entityId, scopeId }: HostEntityDetailsProps) => {
    const timestamp = getField(getFieldValue(hit, '@timestamp')) ?? '';

    return (
      <FlyoutShell hit={hit} title={HOST_TITLE}>
        <HostDetailsView
          hostName={hostName}
          entityId={entityId}
          timestamp={timestamp}
          scopeId={scopeId}
        />
      </FlyoutShell>
    );
  }
);

HostEntityDetails.displayName = 'HostEntityDetails';

/**
 * User details flyout opened from the entity overview.
 */
export const UserEntityDetails = memo(
  ({ hit, userName, entityId, scopeId }: UserEntityDetailsProps) => {
    const timestamp = getField(getFieldValue(hit, '@timestamp')) ?? '';

    return (
      <FlyoutShell hit={hit} title={USER_TITLE}>
        <UserDetailsView
          userName={userName}
          entityId={entityId}
          timestamp={timestamp}
          scopeId={scopeId}
        />
      </FlyoutShell>
    );
  }
);

UserEntityDetails.displayName = 'UserEntityDetails';
