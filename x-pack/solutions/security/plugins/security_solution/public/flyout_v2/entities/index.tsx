/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { memo, useCallback } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { EntityIdentifierFields } from '../../../common/entity_analytics/types';
import { ToolsFlyoutHeader } from '../shared/components/tools_flyout_header';
import { getField } from '../../flyout/document_details/shared/utils';
import { useKibana } from '../../common/lib/kibana';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useOpenToolsFlyout } from '../shared/hooks/use_open_tools_flyout';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from '../document/document_flyout_wrapper';
import { noopCellActionRenderer, type CellActionRenderer } from '../shared/components/cell_actions';
import { HostDetails } from '../../flyout/document_details/left/components/host_details';
import { UserDetails } from '../../flyout/document_details/left/components/user_details';
import { EntitiesDetailsView } from './components/entities_details_view';
import { EntityFindingsDetailsView } from './components/entity_findings_details_view';
import { HOST_DETAILS_VIEW_TEST_ID, USER_DETAILS_VIEW_TEST_ID } from './test_ids';

const ENTITIES_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.title', {
  defaultMessage: 'Entities',
});
const HOST_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.hostTitle', {
  defaultMessage: 'Host details',
});
const USER_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.userTitle', {
  defaultMessage: 'User details',
});
const HOST_ALERTS_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.hostAlertsTitle', {
  defaultMessage: 'Host alerts',
});
const USER_ALERTS_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.userAlertsTitle', {
  defaultMessage: 'User alerts',
});
const HOST_MISCONFIGURATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.hostMisconfigurationsTitle',
  { defaultMessage: 'Host misconfigurations' }
);
const USER_MISCONFIGURATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.userMisconfigurationsTitle',
  { defaultMessage: 'User misconfigurations' }
);
const HOST_VULNERABILITIES_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.hostVulnerabilitiesTitle',
  { defaultMessage: 'Host vulnerabilities' }
);

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
  /**
   * Renderer for cell actions on field values; threaded into the nested document flyout when an
   * alert row is expanded from the alerts insight. Defaults to a no-op renderer.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated?: () => void;
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
  /**
   * Renderer for cell actions on field values; threaded into the nested document flyout when an
   * alert row is expanded from the alerts insight. Defaults to a no-op renderer.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated?: () => void;
}

export interface HostEntityAlertsDetailsProps {
  /**
   * Alert/event document used by the flyout header.
   */
  hit: DataTableRecord;
  /**
   * Resolved host name for the alerts query.
   */
  hostName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
  /**
   * Renderer for cell actions on field values; threaded into the nested document flyout when an
   * alert row is expanded.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated?: () => void;
}

export interface UserEntityAlertsDetailsProps {
  /**
   * Alert/event document used by the flyout header.
   */
  hit: DataTableRecord;
  /**
   * Resolved user name for the alerts query.
   */
  userName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
  /**
   * Renderer for cell actions on field values; threaded into the nested document flyout when an
   * alert row is expanded.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated?: () => void;
}

export interface HostEntityMisconfigurationsDetailsProps {
  /**
   * Alert/event document used by the flyout header.
   */
  hit: DataTableRecord;
  /**
   * Resolved host name for the findings query.
   */
  hostName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
  /**
   * Scope id forwarded to the findings table for cell actions.
   */
  scopeId: string;
}

export interface UserEntityMisconfigurationsDetailsProps {
  /**
   * Alert/event document used by the flyout header.
   */
  hit: DataTableRecord;
  /**
   * Resolved user name for the findings query.
   */
  userName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
  /**
   * Scope id forwarded to the findings table for cell actions.
   */
  scopeId: string;
}

export interface HostEntityVulnerabilitiesDetailsProps {
  /**
   * Alert/event document used by the flyout header.
   */
  hit: DataTableRecord;
  /**
   * Resolved host name for the findings query.
   */
  hostName: string;
  /**
   * Canonical Entity Store v2 id, when already resolved.
   */
  entityId?: string;
  /**
   * Scope id forwarded to the findings table for cell actions.
   */
  scopeId: string;
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
 * Builds a callback that opens the alert document flyout (`DocumentFlyoutWrapper`) inside the
 * current overlay stack. Used by every v2 entity flyout that surfaces an alerts table.
 */
const useOpenAlertFlyout = ({
  renderCellActions,
  onAlertUpdated,
}: {
  renderCellActions: CellActionRenderer;
  onAlertUpdated?: () => void;
}) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

  return useCallback(
    (id: string, indexName: string) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <DocumentFlyoutWrapper
              documentId={id}
              indexName={indexName}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated ?? noop}
            />
          ),
        }),
        {
          ...defaultFlyoutProperties,
          session: 'inherit',
        }
      );
    },
    [defaultFlyoutProperties, history, onAlertUpdated, overlays, renderCellActions, services, store]
  );
};

const noop = () => {};

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
  ({
    hit,
    hostName,
    entityId,
    scopeId,
    renderCellActions = noopCellActionRenderer,
    onAlertUpdated,
  }: HostEntityDetailsProps) => {
    const timestamp = getField(getFieldValue(hit, '@timestamp')) ?? '';
    const openToolsFlyout = useOpenToolsFlyout();

    const onShowAlertsDetails = useCallback(
      () =>
        openToolsFlyout(
          <HostEntityAlertsDetails
            hit={hit}
            hostName={hostName}
            entityId={entityId}
            renderCellActions={renderCellActions}
            onAlertUpdated={onAlertUpdated}
          />
        ),
      [openToolsFlyout, hit, hostName, entityId, renderCellActions, onAlertUpdated]
    );

    const onShowMisconfigurationsDetails = useCallback(
      () =>
        openToolsFlyout(
          <HostEntityMisconfigurationsDetails
            hit={hit}
            hostName={hostName}
            entityId={entityId}
            scopeId={scopeId}
          />
        ),
      [openToolsFlyout, hit, hostName, entityId, scopeId]
    );

    const onShowVulnerabilitiesDetails = useCallback(
      () =>
        openToolsFlyout(
          <HostEntityVulnerabilitiesDetails
            hit={hit}
            hostName={hostName}
            entityId={entityId}
            scopeId={scopeId}
          />
        ),
      [openToolsFlyout, hit, hostName, entityId, scopeId]
    );

    return (
      <FlyoutShell hit={hit} title={HOST_TITLE}>
        <div data-test-subj={HOST_DETAILS_VIEW_TEST_ID}>
          <HostDetails
            hostName={hostName}
            entityId={entityId}
            timestamp={timestamp}
            scopeId={scopeId}
            onShowAlertsDetails={onShowAlertsDetails}
            onShowMisconfigurationsDetails={onShowMisconfigurationsDetails}
            onShowVulnerabilitiesDetails={onShowVulnerabilitiesDetails}
          />
        </div>
      </FlyoutShell>
    );
  }
);

HostEntityDetails.displayName = 'HostEntityDetails';

/**
 * User details flyout opened from the entity overview.
 */
export const UserEntityDetails = memo(
  ({
    hit,
    userName,
    entityId,
    scopeId,
    renderCellActions = noopCellActionRenderer,
    onAlertUpdated,
  }: UserEntityDetailsProps) => {
    const timestamp = getField(getFieldValue(hit, '@timestamp')) ?? '';
    const openToolsFlyout = useOpenToolsFlyout();

    const onShowAlertsDetails = useCallback(
      () =>
        openToolsFlyout(
          <UserEntityAlertsDetails
            hit={hit}
            userName={userName}
            entityId={entityId}
            renderCellActions={renderCellActions}
            onAlertUpdated={onAlertUpdated}
          />
        ),
      [openToolsFlyout, hit, userName, entityId, renderCellActions, onAlertUpdated]
    );

    const onShowMisconfigurationsDetails = useCallback(
      () =>
        openToolsFlyout(
          <UserEntityMisconfigurationsDetails
            hit={hit}
            userName={userName}
            entityId={entityId}
            scopeId={scopeId}
          />
        ),
      [openToolsFlyout, hit, userName, entityId, scopeId]
    );

    return (
      <FlyoutShell hit={hit} title={USER_TITLE}>
        <div data-test-subj={USER_DETAILS_VIEW_TEST_ID}>
          <UserDetails
            userName={userName}
            entityId={entityId}
            timestamp={timestamp}
            scopeId={scopeId}
            onShowAlertsDetails={onShowAlertsDetails}
            onShowMisconfigurationsDetails={onShowMisconfigurationsDetails}
          />
        </div>
      </FlyoutShell>
    );
  }
);

UserEntityDetails.displayName = 'UserEntityDetails';

/**
 * Host alerts flyout opened from the alerts insight on the host entity overview.
 */
export const HostEntityAlertsDetails = memo(
  ({
    hit,
    hostName,
    entityId,
    renderCellActions = noopCellActionRenderer,
    onAlertUpdated,
  }: HostEntityAlertsDetailsProps) => {
    const onAlertOpened = useOpenAlertFlyout({ renderCellActions, onAlertUpdated });
    return (
      <FlyoutShell hit={hit} title={HOST_ALERTS_TITLE}>
        <EntityFindingsDetailsView
          kind="alerts"
          field={EntityIdentifierFields.hostName}
          value={hostName}
          entityId={entityId}
          entityType="host"
          onAlertOpened={onAlertOpened}
        />
      </FlyoutShell>
    );
  }
);

HostEntityAlertsDetails.displayName = 'HostEntityAlertsDetails';

/**
 * User alerts flyout opened from the alerts insight on the user entity overview.
 */
export const UserEntityAlertsDetails = memo(
  ({
    hit,
    userName,
    entityId,
    renderCellActions = noopCellActionRenderer,
    onAlertUpdated,
  }: UserEntityAlertsDetailsProps) => {
    const onAlertOpened = useOpenAlertFlyout({ renderCellActions, onAlertUpdated });
    return (
      <FlyoutShell hit={hit} title={USER_ALERTS_TITLE}>
        <EntityFindingsDetailsView
          kind="alerts"
          field={EntityIdentifierFields.userName}
          value={userName}
          entityId={entityId}
          entityType="user"
          onAlertOpened={onAlertOpened}
        />
      </FlyoutShell>
    );
  }
);

UserEntityAlertsDetails.displayName = 'UserEntityAlertsDetails';

/**
 * Host misconfigurations flyout opened from the misconfigurations insight on the host entity overview.
 */
export const HostEntityMisconfigurationsDetails = memo(
  ({ hit, hostName, entityId, scopeId }: HostEntityMisconfigurationsDetailsProps) => (
    <FlyoutShell hit={hit} title={HOST_MISCONFIGURATIONS_TITLE}>
      <EntityFindingsDetailsView
        kind="misconfigurations"
        field={EntityIdentifierFields.hostName}
        value={hostName}
        entityId={entityId}
        entityType="host"
        scopeId={scopeId}
      />
    </FlyoutShell>
  )
);

HostEntityMisconfigurationsDetails.displayName = 'HostEntityMisconfigurationsDetails';

/**
 * User misconfigurations flyout opened from the misconfigurations insight on the user entity overview.
 */
export const UserEntityMisconfigurationsDetails = memo(
  ({ hit, userName, entityId, scopeId }: UserEntityMisconfigurationsDetailsProps) => (
    <FlyoutShell hit={hit} title={USER_MISCONFIGURATIONS_TITLE}>
      <EntityFindingsDetailsView
        kind="misconfigurations"
        field={EntityIdentifierFields.userName}
        value={userName}
        entityId={entityId}
        entityType="user"
        scopeId={scopeId}
      />
    </FlyoutShell>
  )
);

UserEntityMisconfigurationsDetails.displayName = 'UserEntityMisconfigurationsDetails';

/**
 * Host vulnerabilities flyout opened from the vulnerabilities insight on the host entity overview.
 * Vulnerabilities are host-only — the user entity overview does not surface a vulnerabilities chip.
 */
export const HostEntityVulnerabilitiesDetails = memo(
  ({ hit, hostName, entityId, scopeId }: HostEntityVulnerabilitiesDetailsProps) => (
    <FlyoutShell hit={hit} title={HOST_VULNERABILITIES_TITLE}>
      <EntityFindingsDetailsView
        kind="vulnerabilities"
        field={EntityIdentifierFields.hostName}
        value={hostName}
        entityId={entityId}
        entityType="host"
        scopeId={scopeId}
      />
    </FlyoutShell>
  )
);

HostEntityVulnerabilitiesDetails.displayName = 'HostEntityVulnerabilitiesDetails';
