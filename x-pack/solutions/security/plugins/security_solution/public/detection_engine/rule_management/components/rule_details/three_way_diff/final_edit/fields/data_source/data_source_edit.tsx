/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { css } from '@emotion/css';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { UseMultiFields } from '../../../../../../../../shared_imports';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import { IndexPatternField } from './index_pattern_edit';
import { DataSourceInfoText } from './data_source_info_text';
import { DataViewField } from './data_view_field';
import { DataSourceTypeSelectorField } from './data_source_type_selector_field';

export function DataSourceEdit({ resetForm }: RuleFieldEditComponentProps): JSX.Element {
  return (
    <UseMultiFields<{
      type: string;
      indexPatterns: string[] | undefined;
      dataViewId: string | undefined;
    }>
      fields={{
        type: {
          path: 'type',
        },
        indexPatterns: {
          path: 'index_patterns',
        },
        dataViewId: {
          path: 'data_view_id',
        },
      }}
    >
      {({ type, indexPatterns, dataViewId }) => (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <DataSourceInfoText />
          </EuiFlexItem>
          <EuiFlexItem>
            <DataSourceTypeSelectorField field={type} resetForm={resetForm} />
          </EuiFlexItem>
          <EuiFlexItem>
            <TabContent visible={type.value === DataSourceType.index_patterns}>
              <IndexPatternField key="index-patterns" field={indexPatterns} />
            </TabContent>
            <TabContent visible={type.value === DataSourceType.data_view}>
              <DataViewField key="data-view" field={dataViewId} />
            </TabContent>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </UseMultiFields>
  );
}

interface TabProps {
  visible: boolean;
}

const hidden = css`
  display: none;
`;

function TabContent({ visible, children }: PropsWithChildren<TabProps>): JSX.Element {
  return <div className={!visible ? hidden : undefined}>{children}</div>;
}
