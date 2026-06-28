/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
<<<<<<< HEAD
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { LeftPanelResponseTab } from '../../left';
=======
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNonLocalIndexName } from '@kbn/es-query';
import { FLYOUT_STORAGE_KEYS } from '../../../../flyout_v2/document/constants/local_storage';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { ResponseButton } from './response_button';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
>>>>>>> 9.4
import { useDocumentDetailsContext } from '../../shared/context';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { ResponseSectionContent } from '../../../../flyout_v2/document/main/components/response_section_content';

/**
 * Response section adapter for the legacy expandable flyout overview tab.
 */
export const ResponseSection = memo(() => {
<<<<<<< HEAD
  const { isRulePreview, searchHit } = useDocumentDetailsContext();
  const goToResponseTab = useNavigateToLeftPanel({
    tab: LeftPanelResponseTab,
  });
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
=======
  const { isRulePreview, getFieldsData, indexName } = useDocumentDetailsContext();

  const isRemoteDocument = useMemo(() => isNonLocalIndexName(indexName), [indexName]);

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: false,
  });
  const isAlert = useMemo(
    () => getField(getFieldsData('event.kind')) === EventKind.signal,
    [getFieldsData]
  );

  const content = useMemo(() => {
    if (isRulePreview) {
      return (
        <EuiCallOut
          announceOnMount
          iconType="documentation"
          size="s"
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.response.previewTitle"
              defaultMessage="Response actions"
            />
          }
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.response.previewAriaLabel',
            { defaultMessage: 'Response actions' }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.response.previewMessage"
            defaultMessage="Response is not available in alert preview."
          />
        </EuiCallOut>
      );
    }

    return <ResponseButton />;
  }, [isRulePreview]);

  if (!isAlert || isRemoteDocument) {
    return null;
  }
>>>>>>> 9.4

  return (
    <ResponseSectionContent
      hit={hit}
      isRulePreview={isRulePreview}
      onShowResponseDetails={goToResponseTab}
    />
  );
});

ResponseSection.displayName = 'ResponseSection';
