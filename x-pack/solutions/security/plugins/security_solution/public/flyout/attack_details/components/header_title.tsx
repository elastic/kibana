/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
<<<<<<< HEAD
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { flyoutHeaderBlockStyles } from '../../../flyout_v2/shared/components/flyout_header_block';
=======
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { buildDataTableRecord, getFieldValue, type EsHitRecord } from '@kbn/discover-utils';
import { isNonLocalIndexName } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { flyoutHeaderBlockStyles } from '../../../flyout_v2/document/constants/styles';
import { FlyoutTitle } from '../../../flyout_v2/shared/components/flyout_title';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { Status } from './status';
import { Assignees } from './assignees';
>>>>>>> 9.4
import { Notes } from '../../../flyout_v2/shared/components/notes';
import { AlertsCount } from '../../../flyout_v2/attack/main/components/alerts_count';
import { HeaderTitle as V2HeaderTitle } from '../../../flyout_v2/attack/main/components/header_title';
import { Status } from '../../../flyout_v2/attack/main/components/status';
import { Assignees } from '../../../flyout_v2/attack/main/components/assignees';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';
import { RemoteDocumentBadge } from '../../../flyout_v2/document/components/remote_document_badge';

/**
 * Header title for the legacy attack details flyout.
 * Bridges context → props for the v2 HeaderTitle, then renders the four
 * summary blocks (status, alerts, assignees, notes) in the same 2-column
 * layout as the v2 flyout so both flyouts stay visually identical.
 */
export const HeaderTitle = memo(() => {
<<<<<<< HEAD
  const { searchHit, attackId, refetch } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
=======
  const { title, timestamp, alertsCount } = useHeaderData();
  const { attackId, searchHit } = useAttackDetailsContext();
>>>>>>> 9.4
  const openNotesTab = useNavigateToAttackDetailsLeftPanel({ tab: 'notes' });
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const isRemoteDocument = useMemo(
    () => isNonLocalIndexName(hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? ''),
    [hit]
  );

  return (
    <>
<<<<<<< HEAD
      <V2HeaderTitle hit={hit} />
=======
      {timestamp && (
        <>
          <PreferenceFormattedDate value={new Date(timestamp)} />
          <EuiSpacer size="xs" />
        </>
      )}
      <FlyoutTitle data-test-subj={HEADER_TITLE_TEST_ID} title={title} iconType={'bolt'} />
      {isRemoteDocument ? (
        <RemoteDocumentBadge hit={hit} />
      ) : (
        <>
          <EuiSpacer size="s" />
          <EuiBadge
            aria-label={ATTACK_HEADER_BADGE}
            color="hollow"
            data-test-subj={HEADER_BADGE_TEST_ID}
            tabIndex={0}
          >
            {ATTACK_HEADER_BADGE}
          </EuiBadge>
        </>
      )}
>>>>>>> 9.4
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <Status hit={hit} onAttackUpdated={refetch} />
            </EuiFlexItem>
            <EuiFlexItem>
              <AlertsCount hit={hit} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <Assignees hit={hit} onAttackUpdated={refetch} />
            </EuiFlexItem>
            <EuiFlexItem>
              <Notes documentId={attackId} onShowNotes={openNotesTab} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
