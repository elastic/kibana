/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useCallback } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from '@emotion/styled';
import { CardExpandButton } from './card_expand_button';
import { TextValueDisplay } from './text_value_display';
import { EffectScope } from './effect_scope';
import { CardActionsFlexItem } from './card_actions_flex_item';
import type { ArtifactInfo } from '../types';
import type { ArtifactEntryCollapsibleCardProps } from '../artifact_entry_collapsible_card';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useCollapsedCssClassNames } from '../hooks/use_collapsed_css_class_names';
import { usePolicyNavLinks } from '../hooks/use_policy_nav_links';
import { DescriptionField } from './description_field';

export interface CardCompressedHeaderProps
  extends Pick<CommonProps, 'data-test-subj'>,
    Pick<
      ArtifactEntryCollapsibleCardProps,
      'onExpandCollapse' | 'expanded' | 'actions' | 'policies'
    > {
  artifact: ArtifactInfo;
}

export const CardCompressedHeader = memo<CardCompressedHeaderProps>(
  ({
    artifact,
    onExpandCollapse,
    policies,
    actions,
    expanded = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const policyNavLinks = usePolicyNavLinks(artifact, policies);

    const handleExpandCollapseClick = useCallback(() => {
      onExpandCollapse();
    }, [onExpandCollapse]);

    return (
      <CardCompressedHeaderLayout
        data-test-subj={dataTestSubj}
        expanded={expanded}
        expandToggle={
          <CardExpandButton
            expanded={expanded}
            onClick={handleExpandCollapseClick}
            data-test-subj={getTestId('expandCollapse')}
          />
        }
        name={
          <TextValueDisplay bold truncate={!expanded} withTooltip={!expanded}>
            {artifact.name}
          </TextValueDisplay>
        }
        description={
          <DescriptionField truncate={!expanded} withTooltip={!expanded}>
            {artifact.description}
          </DescriptionField>
        }
        effectScope={
          <EffectScope policies={policyNavLinks} data-test-subj={getTestId('effectScope')} />
        }
        actionMenu={<CardActionsFlexItem actions={actions} data-test-subj={getTestId('actions')} />}
      />
    );
  }
);
CardCompressedHeader.displayName = 'CardCompressedHeader';

const ButtonIconPlaceHolder = styled.div`
  display: inline-block;
  // Sizes below should match that of the Eui's Button Icon, so that it holds the same space.
  width: ${({ theme }) => theme.euiTheme.size.l};
  height: ${({ theme }) => theme.euiTheme.size.l};
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  &.flushTop,
  .flushTop {
    padding-top: 0;
    margin-top: 0;
  }
`;

/**
 * Layout used for the compressed card header. Used also in the ArtifactGrid for creating the grid header row
 */
export interface CardCompressedHeaderLayoutProps extends Pick<CommonProps, 'data-test-subj'> {
  expanded: boolean;
  expandToggle: ReactNode;
  name: ReactNode;
  description: ReactNode;
  effectScope: ReactNode;
  /**
   * The EuiFlexItem react node that contains the actions for the carc. If wanting to NOT include a menu,
   * but still want the placeholder for it be preserved (ex. for the Grid headers), set prop to `true`
   */
  actionMenu?: ReactNode | true;
  /**
   * When set to `true`, all padding and margin values will be set to zero for the top of the header
   * layout, so that all content is flushed to the top
   */
  flushTop?: boolean;
}

export const CardCompressedHeaderLayout = memo<CardCompressedHeaderLayoutProps>(
  ({
    expanded,
    name,
    expandToggle,
    effectScope,
    actionMenu,
    description,
    'data-test-subj': dataTestSubj,
    flushTop,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const cssClassNames = useCollapsedCssClassNames(expanded);
    const flushTopCssClassname = flushTop ? ' flushTop' : '';

    return (
      <StyledEuiFlexGroup
        responsive={false}
        alignItems="center"
        data-test-subj={dataTestSubj}
        className={flushTopCssClassname}
      >
        <EuiFlexItem
          grow={false}
          className={flushTopCssClassname}
          data-test-subj={getTestId('expandCollapseHolder')}
        >
          {expandToggle}
        </EuiFlexItem>
        <EuiFlexItem className={cssClassNames + flushTopCssClassname}>
          <EuiFlexGroup alignItems="center" className={flushTopCssClassname}>
            <EuiFlexItem
              grow={2}
              className={cssClassNames + flushTopCssClassname}
              data-test-subj={getTestId('titleHolder')}
            >
              {name}
            </EuiFlexItem>
            <EuiFlexItem
              grow={3}
              className={cssClassNames + flushTopCssClassname}
              data-test-subj={getTestId('descriptionHolder')}
            >
              {description}
            </EuiFlexItem>
            <EuiFlexItem
              grow={1}
              data-test-subj={getTestId('effectScopeHolder')}
              className={flushTopCssClassname}
            >
              {effectScope}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {actionMenu === true ? (
          <EuiFlexItem
            grow={false}
            data-test-subj={getTestId('cardActionsPlaceholder')}
            className={flushTopCssClassname}
          >
            <ButtonIconPlaceHolder />
          </EuiFlexItem>
        ) : (
          actionMenu
        )}
      </StyledEuiFlexGroup>
    );
  }
);
CardCompressedHeaderLayout.displayName = 'CardCompressedHeaderLayout';
