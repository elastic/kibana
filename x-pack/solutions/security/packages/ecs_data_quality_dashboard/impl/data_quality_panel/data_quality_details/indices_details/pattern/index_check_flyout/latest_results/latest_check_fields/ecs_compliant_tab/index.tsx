/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import { EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';

import { CompareFieldsTable } from '../../../compare_fields_table';
import { EmptyPromptBody } from '../../../empty_prompt_body';
import { EmptyPromptTitle } from '../../../empty_prompt_title';
import type { EcsCompliantFieldMetadata } from '../../../../../../../types';
import { isTimestampFieldMissing } from '../utils/is_timestamp_field_missing';
import { getEcsCompliantTableColumns } from './utils/get_ecs_compliant_table_columns';
import { calloutItemCss } from '../../../styles';
import {
  CUSTOM_DETECTION_ENGINE_RULES_WORK,
  ECS_COMPLIANT_CALLOUT,
  ECS_COMPLIANT_EMPTY,
  ECS_COMPLIANT_EMPTY_TITLE,
  ECS_COMPLIANT_FIELDS_TABLE_TITLE,
  ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED,
  OTHER_APP_CAPABILITIES_WORK_PROPERLY,
  PAGES_DISPLAY_EVENTS,
  PRE_BUILT_DETECTION_ENGINE_RULES_WORK,
} from '../../../translations';

const styles = {
  emptyPromptContainer: css({
    width: '100%',
  }),
};

interface Props {
  indexName: string;
  ecsCompliantFields: EcsCompliantFieldMetadata[];
}

const EcsCompliantTabComponent: React.FC<Props> = ({ indexName, ecsCompliantFields }) => {
  const emptyPromptBody = useMemo(() => <EmptyPromptBody body={ECS_COMPLIANT_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={ECS_COMPLIANT_EMPTY_TITLE} />, []);

  return (
    <div data-test-subj="ecsCompliantTabContent">
      {!isTimestampFieldMissing(ecsCompliantFields) ? (
        <>
          <EuiCallOut size="s">
            <p>
              {ECS_COMPLIANT_CALLOUT({
                fieldCount: ecsCompliantFields.length,
                version: EcsVersion,
              })}
            </p>
            <div css={calloutItemCss}>{PRE_BUILT_DETECTION_ENGINE_RULES_WORK}</div>
            <div css={calloutItemCss}>{CUSTOM_DETECTION_ENGINE_RULES_WORK}</div>
            <div css={calloutItemCss}>{PAGES_DISPLAY_EVENTS}</div>
            <div css={calloutItemCss}>{OTHER_APP_CAPABILITIES_WORK_PROPERLY}</div>
            <div css={calloutItemCss}>{ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED}</div>
          </EuiCallOut>
          <EuiSpacer />
          <CompareFieldsTable
            enrichedFieldMetadata={ecsCompliantFields}
            getTableColumns={getEcsCompliantTableColumns}
            title={ECS_COMPLIANT_FIELDS_TABLE_TITLE(indexName)}
          />
        </>
      ) : (
        <div css={styles.emptyPromptContainer}>
          <EuiEmptyPrompt
            body={emptyPromptBody}
            iconType="cross"
            iconColor="danger"
            title={title}
            titleSize="s"
          />
        </div>
      )}
    </div>
  );
};

EcsCompliantTabComponent.displayName = 'EcsCompliantTabComponent';

export const EcsCompliantTab = React.memo(EcsCompliantTabComponent);
