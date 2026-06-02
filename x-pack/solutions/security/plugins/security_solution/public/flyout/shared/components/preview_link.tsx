/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import { useKibana, useUiSetting } from '../../../common/lib/kibana';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { DocumentEventTypes } from '../../../common/lib/telemetry';
import { getPreviewPanelParams } from '../utils/link_utils';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { IdentityFields } from '../../document_details/shared/utils';
import { useEntityFromStore } from '../../entity_details/shared/hooks/use_entity_from_store';
import {
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';

interface PreviewLinkProps {
  /**
   * Entity id to use for the preview panel
   */
  entityId?: string;
  /**
   * When set (e.g. from document EUID), used with Entity Store v2 to resolve `entity.id` for host/user previews.
   */
  identityFields?: IdentityFields;
  /**
   * Field name
   */
  field: string;
  /**
   * Value to display in EuiLink
   */
  value: string;
  /**
   * Scope id to use for the preview panel
   */
  scopeId: string;
  /**
   * Rule id to use for the preview panel
   */
  ruleId?: string;
  /**
   * Optional data-test-subj value
   */
  ['data-test-subj']?: string;
  /**
   * React components to render, if none provided, the value will be rendered
   */
  children?: React.ReactNode;
  /**
   * The indexName to be passed to the flyout preview panel
   * when clicking on "Source event" id
   */
  ancestorsIndexName?: string;
  /**
   * When `true` (default), clicking the link calls `openPreviewPanel` on the
   * legacy expandable-flyout API.
   *
   * When `false`, the link is still rendered (so the cell remains visually
   * consistent) but `onClick` is a no-op. Pass `false` from v2 callers — e.g.
   * `<UserDetails>` / `<HostDetails>` rendered inside the v2 attack-details
   * Entities child flyout — where the legacy expandable flyout is not the
   * visible host. The dedicated v2 user/host tools flyouts are still in
   * development; once they ship, the no-op branch should be replaced with a
   * call into the new flyout system (or `PreviewLink` should be replaced with
   * a v2 `ChildLink` at the call site).
   */
  useLegacyExpandableFlyout?: boolean;
}

/**
 * Renders a link that opens a preview panel
 * If the field is not previewable, the link will not be rendered
 */
export const PreviewLink: FC<PreviewLinkProps> = ({
  entityId,
  identityFields,
  field,
  value,
  scopeId,
  ruleId,
  children,
  ancestorsIndexName,
  useLegacyExpandableFlyout = true,
  'data-test-subj': dataTestSubj = FLYOUT_PREVIEW_LINK_TEST_ID,
}) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;
  const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;
  const shouldShowLink = field === ALERT_RULE_NAME ? canReadRules : true;
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);

  const resolutionIdentifiers: IdentityFields = useMemo(
    () => identityFields ?? { [field]: value },
    [identityFields, field, value]
  );

  const isHostOrUser = field === HOST_NAME_FIELD_NAME || field === USER_NAME_FIELD_NAME;
  const entityType = field === HOST_NAME_FIELD_NAME ? 'host' : 'user';

  const docEntityId =
    entityType === 'host'
      ? resolutionIdentifiers['host.entity.id']
      : resolutionIdentifiers['user.entity.id'];

  const { entityRecord } = useEntityFromStore({
    entityId: docEntityId,
    identityFields: resolutionIdentifiers,
    entityType,
    skip: !entityStoreV2Enabled || !isHostOrUser || Object.keys(resolutionIdentifiers).length === 0,
  });

  const resolvedEntityId = entityRecord?.entity?.id;
  const previewEntityId = useMemo(() => {
    const candidate = entityId ?? resolvedEntityId;
    if (!candidate) {
      return undefined;
    }
    // Avoid leaking a host id into user preview params (or vice versa), e.g. stale flyout props.
    if (field === USER_NAME_FIELD_NAME && candidate.startsWith('host:')) {
      return resolvedEntityId?.startsWith('user:') ? resolvedEntityId : undefined;
    }
    if (field === HOST_NAME_FIELD_NAME && candidate.startsWith('user:')) {
      return resolvedEntityId?.startsWith('host:') ? resolvedEntityId : undefined;
    }
    return candidate;
  }, [entityId, field, resolvedEntityId]);

  const previewParams = useMemo(
    () =>
      getPreviewPanelParams({
        value,
        field,
        entityId: previewEntityId,
        scopeId,
        ruleId,
        ancestorsIndexName,
      }),
    [value, field, scopeId, ruleId, ancestorsIndexName, previewEntityId]
  );

  const onClick = useCallback(() => {
    if (!useLegacyExpandableFlyout) {
      // TODO replace this no-op with a call into the v2 system flyout once the
      // v2 entity / network preview tools flyouts ship. For now the link is
      // rendered (so v2 callers like the attack-details Entities child flyout
      // keep visual parity with the legacy panel) but does nothing on click.
      return;
    }
    if (previewParams) {
      openPreviewPanel({
        id: previewParams.id,
        params: previewParams.params,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'preview',
      });
    }
  }, [useLegacyExpandableFlyout, scopeId, telemetry, openPreviewPanel, previewParams]);

  return shouldShowLink && previewParams ? (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj}>
      {children ?? value}
    </EuiLink>
  ) : (
    <>{children ?? value}</>
  );
};
