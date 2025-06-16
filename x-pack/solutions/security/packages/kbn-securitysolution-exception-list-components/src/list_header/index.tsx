/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals */

import React from 'react';
import { css } from '@emotion/react';
import type { FC } from 'react';
import {
  EuiFlexGroup,
  EuiIcon,
  EuiPageHeader,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from '../translations';
import { MenuItems } from './menu_items';
import { TextWithEdit } from '../text_with_edit';
import { EditModal } from './edit_modal';
import { ListDetails, Rule } from '../types';
import { useExceptionListHeader } from './use_list_header';
import { textWithEditContainerCss } from '../text_with_edit/text_with_edit.styles';

interface ExceptionListHeaderComponentProps {
  name: string;
  description?: string;
  listId: string;
  isReadonly: boolean;
  linkedRules: Rule[];
  dataTestSubj?: string;
  backOptions: BackOptions;
  canUserEditList?: boolean;
  securityLinkAnchorComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  onEditListDetails: (listDetails: ListDetails) => void;
  onDeleteList: () => void;
  onManageRules: () => void;
  onExportList: () => void;
  onDuplicateList: () => void;
}

export interface BackOptions {
  pageId: string;
  path: string;
  dataTestSubj?: string;
  onNavigate: (path: string) => void;
}

const ExceptionListHeaderComponent: FC<ExceptionListHeaderComponentProps> = ({
  name,
  description,
  listId,
  linkedRules,
  isReadonly,
  dataTestSubj,
  securityLinkAnchorComponent,
  backOptions,
  canUserEditList = true,
  onEditListDetails,
  onDeleteList,
  onManageRules,
  onExportList,
  onDuplicateList,
}) => {
  const { isModalVisible, listDetails, onEdit, onSave, onCancel } = useExceptionListHeader({
    name,
    description,
    onEditListDetails,
  });

  const { euiTheme } = useEuiTheme();
  const subduedTextStyles = css`
    font-size: ${useEuiFontSize('s').fontSize};
    color: ${euiTheme.colors.textSubdued};
    margin-left: ${euiTheme.size.xs};
  `;
  const breadCrumbTextStyles = css`
    font-size: ${useEuiFontSize('xs').fontSize};
  `;
  const descriptionContainerStyles = css`
    // negates the static EuiSpacer when using Title + Description in PageHeader
    margin-top: -${euiTheme.size.m};
    margin-bottom: ${euiTheme.size.s};
  `;

  return (
    <div>
      <EuiPageHeader
        bottomBorder="extended"
        paddingSize="none"
        pageTitle={
          <TextWithEdit
            dataTestSubj={`${dataTestSubj || ''}Title`}
            text={listDetails.name || i18n.EXCEPTION_LIST_HEADER_NAME}
            isReadonly={isReadonly || !canUserEditList}
            onEdit={onEdit}
          />
        }
        responsive
        data-test-subj={`${dataTestSubj || ''}PageHeader`}
        description={
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            css={descriptionContainerStyles}
            component="span"
          >
            <TextWithEdit
              dataTestSubj={`${dataTestSubj || ''}Description`}
              textCss={subduedTextStyles}
              isReadonly={isReadonly || !canUserEditList}
              text={listDetails.description || i18n.EXCEPTION_LIST_HEADER_DESCRIPTION}
              onEdit={onEdit}
            />
            <span css={textWithEditContainerCss} data-test-subj={`${dataTestSubj || ''}ListID`}>
              <EuiText css={subduedTextStyles} component="span">
                {i18n.EXCEPTION_LIST_HEADER_LIST_ID}:
              </EuiText>
              <EuiText css={subduedTextStyles} component="span">
                {listId}
              </EuiText>
            </span>
          </EuiFlexGroup>
        }
        rightSideItems={[
          <MenuItems
            dataTestSubj={`${dataTestSubj || ''}RightSideMenuItems`}
            linkedRules={linkedRules}
            isReadonly={isReadonly}
            canUserEditList={canUserEditList}
            securityLinkAnchorComponent={securityLinkAnchorComponent}
            onDeleteList={onDeleteList}
            onManageRules={onManageRules}
            onExportList={onExportList}
            onDuplicateList={onDuplicateList}
          />,
        ]}
        breadcrumbs={[
          {
            text: (
              <div data-test-subj={`${dataTestSubj || ''}Breadcrumb`} css={breadCrumbTextStyles}>
                <EuiIcon size="s" type="arrowLeft" />
                {i18n.EXCEPTION_LIST_HEADER_BREADCRUMB}
              </div>
            ),
            color: 'primary',
            'aria-current': false,
            href: backOptions.path,
            onClick: (e) => {
              e.preventDefault();
              backOptions.onNavigate(backOptions.path);
            },
          },
        ]}
      />
      {isModalVisible && (
        <EditModal listDetails={listDetails} onSave={onSave} onCancel={onCancel} />
      )}
    </div>
  );
};

ExceptionListHeaderComponent.displayName = 'ExceptionListHeaderComponent';

export const ExceptionListHeader = React.memo(ExceptionListHeaderComponent);

ExceptionListHeader.displayName = 'ExceptionListHeader';
