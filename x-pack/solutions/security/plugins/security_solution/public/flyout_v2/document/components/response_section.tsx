/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNonLocalIndexName } from '@kbn/es-query';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ResponseButton } from './response_button';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { EventKind } from '../constants/event_kinds';
import { RESPONSE_SECTION_TEST_ID } from './test_ids';
import { defaultToolsFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { ResponseDetails } from '../../response';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';

const KEY = 'response';

export interface ResponseSectionProps {
  /**
   * Document to display in the overview tab.
   */
  hit: DataTableRecord;
  /**
   * Whether the flyout is opened in rule preview mode.
   */
  isRulePreview?: boolean;
  /**
   * Optional callback to show Response details. When omitted, a v2 tools flyout is opened.
   */
  onShowResponseDetails?: () => void;
}

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 */
export const ResponseSection = memo<ResponseSectionProps>(
  ({ hit, isRulePreview = false, onShowResponseDetails }) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const isInSecurityApp = useIsInSecurityApp();
    const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

    const indexName = useMemo(
      () => hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '',
      [hit]
    );
    const isRemoteDocument = useMemo(() => isNonLocalIndexName(indexName), [indexName]);

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: KEY,
      defaultValue: false,
    });
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );

    const onShowResponseDetailsFlyout = useCallback(() => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <ResponseDetails hit={hit} />,
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
        }
      );
    }, [history, historyKey, hit, overlays, services, store]);

    const content = useMemo(() => {
      if (isRulePreview) {
        return (
          <EuiCallOut
            announceOnMount
            iconType="documentation"
            size="s"
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.response.previewTitle"
                defaultMessage="Response actions"
              />
            }
            aria-label={i18n.translate('xpack.securitySolution.flyout.response.previewAriaLabel', {
              defaultMessage: 'Response actions',
            })}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.response.previewMessage"
              defaultMessage="Response is not available in alert preview."
            />
          </EuiCallOut>
        );
      }

      return (
        <ResponseButton
          onShowResponseDetails={onShowResponseDetails ?? onShowResponseDetailsFlyout}
        />
      );
    }, [isRulePreview, onShowResponseDetails, onShowResponseDetailsFlyout]);

    if (!isAlert || isRemoteDocument) {
      return null;
    }

    return (
      <ExpandableSection
        expanded={expanded}
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.response.sectionTitle"
            defaultMessage="Response"
          />
        }
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={KEY}
        data-test-subj={RESPONSE_SECTION_TEST_ID}
      >
        {content}
      </ExpandableSection>
    );
  }
);

ResponseSection.displayName = 'ResponseSection';
