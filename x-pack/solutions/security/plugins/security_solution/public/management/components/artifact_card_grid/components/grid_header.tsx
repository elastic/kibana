/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { CommonProps } from '@elastic/eui';
import { EuiButtonIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CardCompressedHeaderLayout, CardSectionPanel } from '../../artifact_entry_card';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export type GridHeaderProps = Pick<CommonProps, 'data-test-subj'> & {
  expandAllIconType: 'fold' | 'unfold';
  onExpandCollapseAll(): void;
  showEnabledColumn?: boolean;
};
export const GridHeader = memo<GridHeaderProps>(
  ({
    'data-test-subj': dataTestSubj,
    expandAllIconType,
    onExpandCollapseAll,
    showEnabledColumn = false,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const expandToggleElement = useMemo(
      () => (
        <EuiToolTip
          content={i18n.translate('xpack.securitySolution.artifactCardGrid.expandCollapseLabel', {
            defaultMessage: 'Toggle all cards',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj={getTestId('expandCollapseAllButton')}
            aria-label={i18n.translate(
              'xpack.securitySolution.artifactCardGrid.expandCollapseLabel',
              {
                defaultMessage: 'Toggle all cards',
              }
            )}
            aria-expanded={expandAllIconType === 'fold'}
            iconType={expandAllIconType}
            onClick={() => onExpandCollapseAll()}
          />
        </EuiToolTip>
      ),
      [getTestId, expandAllIconType, onExpandCollapseAll]
    );

    return (
      <CardSectionPanel gridHeader data-test-subj={dataTestSubj}>
        <CardCompressedHeaderLayout
          expanded={false}
          expandToggle={expandToggleElement}
          data-test-subj={getTestId('layout')}
          flushTop={true}
          name={
            <EuiText size="xs" data-test-subj={getTestId('name')}>
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.artifactCardGrid.nameColumn"
                  defaultMessage="Name"
                />
              </strong>
            </EuiText>
          }
          description={
            <EuiText size="xs" data-test-subj={getTestId('description')}>
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.artifactCardGrid.DescriptionColumn"
                  defaultMessage="Description"
                />
              </strong>
            </EuiText>
          }
          effectScope={
            <EuiText size="xs" data-test-subj={getTestId('assignment')}>
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.artifactCardGrid.assignmentColumn"
                  defaultMessage="Assignment"
                />
              </strong>
            </EuiText>
          }
          enabledStatus={
            showEnabledColumn ? (
              <EuiText size="xs" data-test-subj={getTestId('enabled')}>
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.artifactCardGrid.enabledColumn"
                    defaultMessage="Enabled"
                  />
                </strong>
              </EuiText>
            ) : undefined
          }
          actionMenu={true}
        />
      </CardSectionPanel>
    );
  }
);
GridHeader.displayName = 'GridHeader';
