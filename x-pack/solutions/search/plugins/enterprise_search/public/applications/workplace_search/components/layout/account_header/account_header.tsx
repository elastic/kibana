/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiText,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';

import { getWorkplaceSearchUrl } from '../../../../shared/enterprise_search_url';
import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { AppLogic } from '../../../app_logic';
import { WORKPLACE_SEARCH_TITLE, ACCOUNT_NAV } from '../../../constants';
import { PRIVATE_SOURCES_PATH, LOGOUT_ROUTE, PERSONAL_SETTINGS_PATH } from '../../../routes';

export const AccountHeader: React.FC = () => {
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };
  const closePopover = () => {
    setPopover(false);
  };

  const {
    account: { isAdmin },
  } = useValues(AppLogic);

  const accountNavItems = [
    <EuiContextMenuItem key="accountSettings">
      <EuiButtonEmptyTo to={PERSONAL_SETTINGS_PATH}>{ACCOUNT_NAV.SETTINGS}</EuiButtonEmptyTo>
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="logout">
      <EuiButtonEmptyTo to={LOGOUT_ROUTE} shouldNotCreateHref>
        {ACCOUNT_NAV.LOGOUT}
      </EuiButtonEmptyTo>
    </EuiContextMenuItem>,
  ];

  const accountButton = (
    <EuiButtonEmpty
      size="s"
      data-test-subj="AccountButton"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
    >
      {ACCOUNT_NAV.ACCOUNT}
    </EuiButtonEmpty>
  );

  return (
    <EuiHeader>
      <EuiHeaderSection grow={false}>
        <EuiHeaderSectionItem>
          <EuiHeaderLogo iconType="logoWorkplaceSearch" />
          <EuiText role="banner">{WORKPLACE_SEARCH_TITLE}</EuiText>
        </EuiHeaderSectionItem>
        <EuiHeaderSectionItem>
          <EuiHeaderLinks>
            <EuiButtonEmptyTo to={PRIVATE_SOURCES_PATH}>{ACCOUNT_NAV.SOURCES}</EuiButtonEmptyTo>
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
      <EuiHeaderSection grow={false} side="right">
        <EuiHeaderLinks>
          {isAdmin && <EuiButtonEmptyTo to="/">{ACCOUNT_NAV.ORG_DASHBOARD}</EuiButtonEmptyTo>}
          <EuiPopover
            id="accountSubNav"
            button={accountButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s" items={accountNavItems} />
          </EuiPopover>
          <EuiButton href={getWorkplaceSearchUrl('/search')} target="_blank" iconType="search">
            {ACCOUNT_NAV.SEARCH}
          </EuiButton>
        </EuiHeaderLinks>
      </EuiHeaderSection>
    </EuiHeader>
  );
};
