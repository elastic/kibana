/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Spacer } from '../../../../common/components/page';
import { DefaultDraggable } from '../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { MoreContainer } from '../more_container';

interface DefaultFieldRendererProps {
  attrName: string;
  displayCount?: number;
  idPrefix: string;
  moreMaxHeight?: string;
  render?: (item: string) => React.ReactNode;
  rowItems: string[] | null | undefined;
  scopeId?: string;
}

/** The default max-height of the popover used to show "+n More" items (e.g. `+9 More`) */
export const DEFAULT_MORE_MAX_HEIGHT = '200px';

export const DefaultFieldRendererComponent: React.FC<DefaultFieldRendererProps> = ({
  attrName,
  displayCount = 1,
  idPrefix,
  moreMaxHeight = DEFAULT_MORE_MAX_HEIGHT,
  render,
  rowItems,
  scopeId,
}) => {
  if (rowItems != null && rowItems.length > 0) {
    const draggables = rowItems.slice(0, displayCount).map((rowItem, index) => {
      const id = escapeDataProviderId(
        `default-field-renderer-default-draggable-${idPrefix}-${attrName}-${rowItem}`
      );
      return (
        <EuiFlexItem key={id} grow={false}>
          {index !== 0 && (
            <>
              {','}
              <Spacer />
            </>
          )}
          {typeof rowItem === 'string' && (
            <DefaultDraggable
              id={id}
              field={attrName}
              value={rowItem}
              isAggregatable={true}
              scopeId={scopeId}
              fieldType={'keyword'}
            >
              {render ? render(rowItem) : rowItem}
            </DefaultDraggable>
          )}
        </EuiFlexItem>
      );
    });

    return draggables.length > 0 ? (
      <EuiFlexGroup
        css={{ flexGrow: 'unset' }}
        alignItems="center"
        gutterSize="none"
        component="span"
        data-test-subj="DefaultFieldRendererComponent"
      >
        <EuiFlexItem grow={false}>{draggables} </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DefaultFieldRendererOverflow
            attrName={attrName}
            idPrefix={idPrefix}
            moreMaxHeight={moreMaxHeight}
            overflowIndexStart={displayCount}
            render={render}
            rowItems={rowItems}
            scopeId={scopeId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      getEmptyTagValue()
    );
  } else {
    return getEmptyTagValue();
  }
};

export const DefaultFieldRenderer = React.memo(DefaultFieldRendererComponent);

DefaultFieldRenderer.displayName = 'DefaultFieldRenderer';

interface DefaultFieldRendererOverflowProps {
  attrName: string;
  rowItems: string[];
  idPrefix: string;
  render?: (item: string) => React.ReactNode;
  overflowIndexStart?: number;
  moreMaxHeight: string;
  scopeId?: string;
}

export const DefaultFieldRendererOverflow = React.memo<DefaultFieldRendererOverflowProps>(
  ({ attrName, idPrefix, moreMaxHeight, overflowIndexStart = 5, render, rowItems, scopeId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const togglePopover = useCallback(() => setIsOpen((currentIsOpen) => !currentIsOpen), []);
    const button = useMemo(
      () => (
        <>
          {' ,'}
          <EuiButtonEmpty
            size="xs"
            onClick={togglePopover}
            data-test-subj="DefaultFieldRendererOverflow-button"
          >
            {`+${rowItems.length - overflowIndexStart} `}
            <FormattedMessage
              id="xpack.securitySolution.fieldRenderers.moreLabel"
              defaultMessage="More"
            />
          </EuiButtonEmpty>
        </>
      ),
      [togglePopover, overflowIndexStart, rowItems.length]
    );

    return (
      <EuiFlexItem grow={false}>
        {rowItems.length > overflowIndexStart && (
          <EuiPopover
            id="popover"
            button={button}
            isOpen={isOpen}
            closePopover={togglePopover}
            repositionOnScroll
            panelClassName="withHoverActions__popover"
          >
            <MoreContainer
              fieldName={attrName}
              idPrefix={idPrefix}
              render={render}
              values={rowItems}
              overflowIndexStart={overflowIndexStart}
              scopeId={scopeId}
            />
          </EuiPopover>
        )}
      </EuiFlexItem>
    );
  }
);

DefaultFieldRendererOverflow.displayName = 'DefaultFieldRendererOverflow';
