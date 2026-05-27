/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import classNames from 'classnames';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PageScope } from '../../../../data_view_manager/constants';
import { TimelineContext } from '../../timeline/context';
import { getSourcererScopeId } from '../../../../helpers';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';
import { CellActionsMode, SecurityCellActions } from '../../../../common/components/cell_actions';

interface MoreContainerProps {
  fieldName: string;
  values: string[];
  idPrefix: string;
  moreMaxHeight?: string;
  overflowIndexStart: number;
  render?: (item: string) => React.ReactNode;
  scopeId?: string;
}
/** The default max-height of the popover used to show "+n More" items (e.g. `+9 More`) */
export const DEFAULT_MORE_MAX_HEIGHT = '200px';

export const MoreContainer = React.memo<MoreContainerProps>(
  ({
    fieldName,
    idPrefix,
    moreMaxHeight = DEFAULT_MORE_MAX_HEIGHT,
    overflowIndexStart,
    render,
    values,
    scopeId,
  }) => {
    const { timelineId } = useContext(TimelineContext);
    const defaultedScopeId = scopeId ?? timelineId;
    const sourcererScopeId = getSourcererScopeId(defaultedScopeId ?? '');

    const moreItemsWithHoverActions = useMemo(
      () =>
        values.slice(overflowIndexStart).reduce<React.ReactElement[]>((acc, value, index) => {
          const id = escapeDataProviderId(`${idPrefix}-${fieldName}-${value}-${index}`);

          if (typeof value === 'string' && fieldName != null) {
            acc.push(
              <EuiFlexItem key={id}>
                <SecurityCellActions
                  key={id}
                  mode={CellActionsMode.HOVER_DOWN}
                  visibleCellActions={5}
                  showActionTooltips
                  triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
                  data={{ value, field: fieldName }}
                  sourcererScopeId={sourcererScopeId ?? PageScope.default}
                  metadata={{ scopeId: defaultedScopeId ?? undefined }}
                >
                  <>{render ? render(value) : defaultToEmptyTag(value)}</>
                </SecurityCellActions>
              </EuiFlexItem>
            );
          }

          return acc;
        }, []),
      [values, overflowIndexStart, idPrefix, fieldName, sourcererScopeId, defaultedScopeId, render]
    );

    const moreContainerStyles = () => css`
      max-height: ${moreMaxHeight};
      padding-right: 2px;
    `;

    const moreContainerClasses = classNames(moreContainerStyles(), 'eui-yScroll');

    return (
      <div data-test-subj="more-container" className={moreContainerClasses}>
        <EuiFlexGroup gutterSize="s" direction="column" data-test-subj="overflow-items">
          {moreItemsWithHoverActions}
        </EuiFlexGroup>
      </div>
    );
  }
);
MoreContainer.displayName = 'MoreContainer';
