/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';

interface KeyFieldsListProps {
  firstSeen: string | null;
  lastSeen: string | null;
  sources: string[];
  entityId?: string;
}

const LABELS = {
  firstSeen: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.card.firstSeen',
    { defaultMessage: 'First seen' }
  ),
  lastSeen: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.card.lastSeen',
    { defaultMessage: 'Last seen' }
  ),
  sources: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.card.sources',
    { defaultMessage: 'Data source' }
  ),
  entityId: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.card.entityId',
    { defaultMessage: 'Entity ID' }
  ),
};

export const KeyFieldsList: React.FC<KeyFieldsListProps> = ({
  firstSeen,
  lastSeen,
  sources,
  entityId,
}) => {
  const items = useMemo<EuiDescriptionListProps['listItems']>(() => {
    const result: EuiDescriptionListProps['listItems'] = [];
    if (sources.length > 0) {
      result.push({ title: LABELS.sources, description: sources.join(', ') });
    }
    if (firstSeen) {
      result.push({
        title: LABELS.firstSeen,
        description: <FormattedRelativePreferenceDate value={firstSeen} />,
      });
    }
    if (lastSeen) {
      result.push({
        title: LABELS.lastSeen,
        description: <FormattedRelativePreferenceDate value={lastSeen} />,
      });
    }
    if (entityId) {
      result.push({ title: LABELS.entityId, description: entityId });
    }
    return result;
  }, [firstSeen, lastSeen, sources, entityId]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        compressed
        listItems={items}
        data-test-subj="entityAttachmentKeyFields"
      />
    </>
  );
};
