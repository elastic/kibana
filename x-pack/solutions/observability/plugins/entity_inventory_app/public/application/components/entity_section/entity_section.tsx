/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InventoryType, SourceError } from '@kbn/entity-inventory-plugin/common';
import { useEntityList } from '../../hooks/use_entity_list';
import { EntityTable } from '../entity_table/entity_table';
import {
  ENTITY_COUNT_LABEL,
  SOURCE_ERRORS_TITLE,
  getEntityCountValue,
  getSourceErrorText,
} from './translations';

/** A warning icon whose tooltip lists each source of `errors` that failed. */
const SourceErrorsIndicator = ({ errors }: { errors: readonly SourceError[] }) => (
  <EuiIconTip
    type="warning"
    color="warning"
    title={SOURCE_ERRORS_TITLE}
    aria-label={SOURCE_ERRORS_TITLE}
    content={
      <ul>
        {/* Both plans of one source can fail, so an index pattern can appear twice. */}
        {errors.map((sourceError, index) => (
          <li key={index}>{getSourceErrorText(sourceError)}</li>
        ))}
      </ul>
    }
    iconProps={{ 'data-test-subj': 'entityInventorySourceErrorsIndicator' }}
  />
);

export interface EntitySectionProps {
  entityType: InventoryType;
  onTruncatedChange: (truncated: boolean) => void;
}

export const EntitySection = ({ entityType, onTruncatedChange }: EntitySectionProps) => {
  const { type, name } = entityType;
  const accordionId = useGeneratedHtmlId({ prefix: 'entityInventoryTypeSection' });
  const listResult = useEntityList(type);
  const { data: list, loading, error } = listResult;
  const { truncated } = list;
  const showEntityCount = !error && (!loading || list.rows.length > 0);

  useEffect(() => {
    if (!truncated) {
      return;
    }
    onTruncatedChange(true);
    return () => onTruncatedChange(false);
  }, [truncated, onTruncatedChange]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="entityInventoryTypeSection"
      data-entity-type={type}
    >
      <EuiAccordion
        id={accordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>{name}</h3>
          </EuiTitle>
        }
        extraAction={
          showEntityCount && (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {list.errors.length > 0 && (
                <EuiFlexItem grow={false}>
                  <SourceErrorsIndicator errors={list.errors} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="s">{ENTITY_COUNT_LABEL}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="entityInventoryTypeSectionCount">
                  {getEntityCountValue({ count: list.rows.length, truncated })}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
        paddingSize="s"
      >
        <EntityTable entityType={entityType} listResult={listResult} />
      </EuiAccordion>
    </EuiPanel>
  );
};
