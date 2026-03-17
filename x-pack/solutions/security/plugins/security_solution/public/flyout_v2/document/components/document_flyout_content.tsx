/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { SecurityPageName } from '@kbn/deeplinks-security';
import type { ResolverCellActionRenderer } from '../../../resolver/types';
import { DocumentHeader } from './document_header';
import { OverviewTab } from '../tabs/overview_tab';
import { useKibana } from '../../../common/lib/kibana';
import { getRuleDetailsUrl } from '../../../common/components/link_to';

export interface DocumentFlyoutContentProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Cell action renderer for the analyzer
   */
  renderCellActions: ResolverCellActionRenderer;
}

/**
 * Content for the document flyout, combining the header and overview tab.
 * This component resolves the rule details link via the application service.
 */
export const DocumentFlyoutContent: FC<DocumentFlyoutContentProps> = memo(
  ({ hit, renderCellActions }) => {
    const { services } = useKibana();

    const ruleId = useMemo(
      () => (getFieldValue(hit, ALERT_RULE_UUID) as string | null) ?? null,
      [hit]
    );

    const ruleDetailsHref = useMemo(() => {
      if (!ruleId) return undefined;
      const path = getRuleDetailsUrl(ruleId);
      return services.application.getUrlForApp('securitySolutionUI', {
        deepLinkId: SecurityPageName.rules,
        path,
      });
    }, [ruleId, services.application]);

    return (
      <>
        <DocumentHeader hit={hit} titleHref={ruleDetailsHref} />
        <OverviewTab hit={hit} renderCellActions={renderCellActions} />
      </>
    );
  }
);

DocumentFlyoutContent.displayName = 'DocumentFlyoutContent';
