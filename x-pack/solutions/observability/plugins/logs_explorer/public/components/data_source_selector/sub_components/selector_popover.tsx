/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverProps,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import {
  DatasetSelection,
  DataSourceSelection,
  DataViewSelection,
  isDataViewSelection,
} from '../../../../common/data_source_selection';
import { DATA_SOURCE_SELECTOR_WIDTH, POPOVER_ID } from '../constants';
import { getPopoverButtonStyles } from '../utils';

const panelStyle = { width: DATA_SOURCE_SELECTOR_WIDTH };
interface SelectorPopoverProps extends Omit<EuiPopoverProps, 'button'> {
  children: React.ReactNode;
  onClick: () => void;
  selection: DataSourceSelection;
}

export const SelectorPopover = ({
  children,
  onClick,
  selection,
  ...props
}: SelectorPopoverProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const buttonStyles = getPopoverButtonStyles({ fullWidth: isMobile });

  return (
    <EuiPopover
      id={POPOVER_ID}
      data-test-subj="dataSourceSelectorPopover"
      anchorPosition={isMobile ? 'downCenter' : 'downLeft'}
      button={
        <EuiButton
          css={buttonStyles}
          iconType="arrowDown"
          iconSide="right"
          onClick={onClick}
          fullWidth={isMobile}
          data-test-subj="dataSourceSelectorPopoverButton"
        >
          {isDataViewSelection(selection) ? (
            <DataViewPopoverContent dataViewSelection={selection} />
          ) : (
            <DatasetPopoverContent datasetSelection={selection} />
          )}
        </EuiButton>
      }
      panelPaddingSize="none"
      buffer={8}
      {...(isMobile && { display: 'block' })}
      {...props}
    >
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        css={panelStyle}
        data-test-subj="dataSourceSelectorContent"
      >
        {children}
      </EuiPanel>
    </EuiPopover>
  );
};

const DataViewPopoverContent = ({
  dataViewSelection,
}: {
  dataViewSelection: DataViewSelection;
}) => {
  const { name } = dataViewSelection.selection.dataView;

  return <span className="eui-textTruncate">{name}</span>;
};

const DatasetPopoverContent = ({ datasetSelection }: { datasetSelection: DatasetSelection }) => {
  const { iconType, parentIntegration } = datasetSelection.selection.dataset;
  const title = datasetSelection.selection.dataset.getFullTitle();
  const hasIntegration = typeof parentIntegration === 'object';

  return (
    <>
      {iconType ? (
        <EuiIcon type={iconType} />
      ) : hasIntegration ? (
        <PackageIcon
          packageName={parentIntegration.name ?? ''}
          version={parentIntegration.version ?? '1.0.0'}
          icons={parentIntegration.icons}
          size="m"
          tryApi
        />
      ) : null}
      <span className="eui-textTruncate">{title}</span>
    </>
  );
};
