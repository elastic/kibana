/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { useHistory } from 'react-router-dom';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { getOrEmptyTagFromValue } from '../../common/components/empty_value';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { buildFlyoutContent } from '../../flyout_v2/shared/utils/build_flyout_content';
import type { StartServices } from '../../types';
import type { SecurityAppStore } from '../../common/store/types';

export interface RuleNameCellRendererProps extends DataGridCellValueElementProps {
  /** Kibana start services, used to access overlays for opening the rule details flyout */
  services: StartServices;
  /** Redux store passed through to the flyout providers */
  store: SecurityAppStore;
}

/**
 * Cell renderer for the kibana.alert.rule.name column in One Discover.
 * Renders the rule name as a clickable link that opens the rule details flyout.
 */
export const RuleNameCellRenderer = React.memo<RuleNameCellRendererProps>(
  ({ services, store, ...props }) => {
    const history = useHistory();
    const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
    const { overlays } = services;

    const ruleName = useMemo(() => {
      const raw = props.row.flattened[props.columnId];
      if (Array.isArray(raw)) return raw[0] != null ? String(raw[0]) : null;
      return raw != null ? String(raw) : null;
    }, [props.row.flattened, props.columnId]);

    const ruleId = useMemo(() => {
      const raw = props.row.flattened[ALERT_RULE_UUID];
      if (Array.isArray(raw)) return raw[0] != null ? String(raw[0]) : null;
      return raw != null ? String(raw) : null;
    }, [props.row.flattened]);

    const flyoutContent = useMemo(
      () => (ruleId ? buildFlyoutContent(props.columnId, ruleId) : null),
      [props.columnId, ruleId]
    );

    const handleClick = useCallback(() => {
      if (!flyoutContent) return;
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: flyoutContent,
        }),
        {
          ...defaultDocumentFlyoutProperties,
          session: 'start',
        }
      );
    }, [defaultDocumentFlyoutProperties, overlays, services, store, history, flyoutContent]);

    if (!ruleName) {
      return getOrEmptyTagFromValue(null);
    }

    if (!flyoutContent) {
      return <span data-test-subj="one-discover-rule-name">{ruleName}</span>;
    }

    return (
      <EuiLink onClick={handleClick} data-test-subj="one-discover-rule-name-link">
        {ruleName}
      </EuiLink>
    );
  }
);

RuleNameCellRenderer.displayName = 'RuleNameCellRenderer';
