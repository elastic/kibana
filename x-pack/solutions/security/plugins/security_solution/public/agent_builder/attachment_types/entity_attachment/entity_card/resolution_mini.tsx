/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useResolutionGroup } from '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group';
import { ResolutionGroupTable } from '../../../../entity_analytics/components/entity_resolution/resolution_group_table';

interface ResolutionMiniProps {
  entityStoreEntityId?: string;
  currentEntityStoreEntityId?: string;
}

const TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.resolution.title',
  { defaultMessage: 'Resolution group' }
);

const MEMBERS_LABEL = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.resolution.membersLabel', {
    defaultMessage: '{count, plural, one {# linked entity} other {# linked entities}}',
    values: { count },
  });

const EMPTY_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.resolution.emptyLabel',
  { defaultMessage: 'No resolution group yet.' }
);

/**
 * Chat-scale recreation of the flyout's `ResolutionSection`. Reuses the
 * shared `useResolutionGroup` hook + `ResolutionGroupTable` rendered in
 * read-only mode (`showActions={false}`). Rebuilds only the accordion
 * shell so we don't pull in `ExpandablePanel` / `useExpandableFlyoutApi`.
 */
export const ResolutionMini: React.FC<ResolutionMiniProps> = ({
  entityStoreEntityId,
  currentEntityStoreEntityId,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'entityAttachmentResolutionMini' });
  const enabled = Boolean(entityStoreEntityId);

  const {
    data: group,
    isLoading,
    isError,
  } = useResolutionGroup(entityStoreEntityId ?? '', {
    enabled,
  });

  if (!enabled) {
    return null;
  }

  const hasGroup = !!group && group.group_size > 1;
  if (!isLoading && !isError && !hasGroup) {
    return null;
  }

  const targetEntityId = group?.target
    ? (group.target as { entity?: { id?: string } }).entity?.id ??
      String((group.target as Record<string, unknown>)['entity.id'] ?? '')
    : undefined;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="none"
      data-test-subj="entityAttachmentResolutionMini"
    >
      <EuiAccordion
        id={accordionId}
        initialIsOpen={false}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>{TITLE}</h4>
              </EuiTitle>
            </EuiFlexItem>
            {hasGroup && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {MEMBERS_LABEL(group.group_size)}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        {hasGroup || isLoading ? (
          <ResolutionGroupTable
            group={group ?? null}
            isLoading={isLoading}
            isError={isError}
            targetEntityId={targetEntityId}
            currentEntityId={currentEntityStoreEntityId}
            showActions={false}
          />
        ) : (
          <EuiText size="xs" color="subdued">
            {EMPTY_LABEL}
          </EuiText>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};
