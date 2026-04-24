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
    services: { application, share },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const indexManagementLocator = share?.url.locators.get('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');

  const items = [
    <EuiContextMenuItem
      key="upload"
      icon="upload"
      data-test-subj="gettingStartedUploadMenuItem"
      onClick={() => {
        closePopover();
        application.navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' });
      }}
    >
      {i18n.translate('xpack.search.gettingStarted.addDataButton.uploadFile', {
        defaultMessage: 'Upload a file',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="sample"
      icon="folderOpen"
      data-test-subj="gettingStartedSampleDataMenuItem"
      onClick={() => {
        closePopover();
        application.navigateToApp('home', { path: '#/tutorial_directory/sampleData' });
      }}
    >
      {i18n.translate('xpack.search.gettingStarted.addDataButton.browseSampleData', {
        defaultMessage: 'Browse sample datasets',
      })}
    </EuiContextMenuItem>,
    ...(indexManagementLocator
      ? [
          <EuiContextMenuItem
            key="empty"
            icon="indexOpen"
            data-test-subj="gettingStartedCreateIndexMenuItem"
            onClick={() => {
              closePopover();
              indexManagementLocator.navigate({
                page: 'index_list',
              });
            }}
          >
            {i18n.translate('xpack.search.gettingStarted.addDataButton.createEmptyIndex', {
              defaultMessage: 'Create an empty index',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  const button = (
    <EuiButton
      color="primary"
      fill={true}
      iconType="chevronSingleDown"
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
