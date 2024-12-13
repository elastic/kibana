/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { Actions } from '../../../../../actions';
import { SameFamilyCallout } from '../same_family_callout';
import { CompareFieldsTable } from '../compare_fields_table';
import { useDataQualityContext } from '../../../../../data_quality_context';
import { getAllSameFamilyMarkdownComments } from './utils/markdown';
import type { IlmPhase, SameFamilyFieldMetadata } from '../../../../../types';
import { StickyActions } from '../latest_results/latest_check_fields/sticky_actions';
import { getSameFamilyTableColumns } from './utils/get_same_family_table_columns';
import { SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE } from '../translations';

interface Props {
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  patternDocsCount?: number;
  sizeInBytes: number | undefined;
  sameFamilyFields: SameFamilyFieldMetadata[];
  incompatibleFieldsCount: number;
  customFieldsCount: number;
  ecsCompliantFieldsCount: number;
  allFieldsCount: number;
  hasStickyActions?: boolean;
}

const SameFamilyTabComponent: React.FC<Props> = ({
  docsCount,
  ilmPhase,
  indexName,
  patternDocsCount,
  sizeInBytes,
  sameFamilyFields,
  incompatibleFieldsCount,
  customFieldsCount,
  ecsCompliantFieldsCount,
  allFieldsCount,
  hasStickyActions = true,
}) => {
  const { isILMAvailable, formatBytes, formatNumber } = useDataQualityContext();
  const markdownComment: string = useMemo(
    () =>
      getAllSameFamilyMarkdownComments({
        docsCount,
        formatBytes,
        formatNumber,
        ilmPhase,
        indexName,
        isILMAvailable,
        sameFamilyFields,
        incompatibleFieldsCount,
        customFieldsCount,
        ecsCompliantFieldsCount,
        allFieldsCount,
        patternDocsCount,
        sizeInBytes,
      }).join('\n'),
    [
      allFieldsCount,
      customFieldsCount,
      docsCount,
      ecsCompliantFieldsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      incompatibleFieldsCount,
      indexName,
      isILMAvailable,
      patternDocsCount,
      sameFamilyFields,
      sizeInBytes,
    ]
  );

  return (
    <div data-test-subj="sameFamilyTabContent">
      <SameFamilyCallout fieldCount={sameFamilyFields.length} />

      <>
        {sameFamilyFields.length > 0 && (
          <>
            <EuiSpacer />

            <CompareFieldsTable
              enrichedFieldMetadata={sameFamilyFields}
              getTableColumns={getSameFamilyTableColumns}
              title={SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE(indexName)}
            />
          </>
        )}
      </>

      <EuiSpacer size={sameFamilyFields.length > 0 ? 'm' : 'l'} />
      {hasStickyActions ? (
        <StickyActions
          markdownComment={markdownComment}
          indexName={indexName}
          showCopyToClipboardAction={true}
        />
      ) : (
        <Actions
          markdownComment={markdownComment}
          indexName={indexName}
          showCopyToClipboardAction={true}
        />
      )}
    </div>
  );
};

SameFamilyTabComponent.displayName = 'SameFamilyTabComponent';

export const SameFamilyTab = React.memo(SameFamilyTabComponent);
