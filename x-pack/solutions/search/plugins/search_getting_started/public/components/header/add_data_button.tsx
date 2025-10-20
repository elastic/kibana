/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButton, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const AddDataButton: React.FC = () => {
  const {
    services: { application },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const items = [
    <EuiContextMenuItem
      key="upload"
      icon="exportAction"
      onClick={() => {
        closePopover();
        application.navigateToUrl('/app/ml/filedatavisualizer');
      }}
    >
      {i18n.translate('xpack.search.gettingStarted.addDataButton.uploadFile', {
        defaultMessage: 'Upload a file',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="sample"
      icon="folderOpen"
      onClick={() => {
        closePopover();
        application.navigateToUrl('/app/home#/tutorial_directory/sampleData');
      }}
    >
      {i18n.translate('xpack.search.gettingStarted.addDataButton.browseSampleData', {
        defaultMessage: 'Browse sample data sets',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="empty"
      icon="indexOpen"
      onClick={() => {
        closePopover();
        application.navigateToUrl('/app/elasticsearch/indices/create');
      }}
    >
      {i18n.translate('xpack.search.gettingStarted.addDataButton.createEmptyIndex', {
        defaultMessage: 'Create an empty index',
      })}
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButton
      color="primary"
      fill={true}
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      data-test-subj="gettingStartedAddDataButton"
    >
      {i18n.translate('xpack.search.gettingStarted.addDataButton.label', {
        defaultMessage: 'Add data',
      })}
    </EuiButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
