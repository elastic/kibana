/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiProgress,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import styled, { css as styleCss } from 'styled-components';

import type { LinkIconProps } from '../link_icon';
import { LinkIcon } from '../link_icon';
import type { SubtitleProps } from '../subtitle';
import { Subtitle } from '../subtitle';
import { Title } from './title';
import type { BadgeOptions, TitleProp } from './types';
import { useFormatUrl } from '../link_to';
import type { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../lib/kibana';
interface HeaderProps {
  border?: boolean;
  isLoading?: boolean;
}

const LinkBack = styled.div.attrs({
  className: 'securitySolutionHeaderPage__linkBack',
})`
  ${({ theme }) => styleCss`
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    margin-bottom: ${theme.eui.euiSizeS};
  `}
`;
LinkBack.displayName = 'LinkBack';

const HeaderSection = styled(EuiPageHeaderSection)`
  // Without  min-width: 0, as a flex child, it wouldn't shrink properly
  // and could overflow its parent.
  min-width: 0;
  max-width: 100%;
`;
HeaderSection.displayName = 'HeaderSection';

function Divider(): JSX.Element {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        border-bottom: ${euiTheme.border.thin};
      `}
    />
  );
}

interface BackOptions {
  pageId: SecurityPageName;
  text: LinkIconProps['children'];
  path?: string;
  dataTestSubj?: string;
}

export interface HeaderPageProps extends HeaderProps {
  backOptions?: BackOptions;
  /** A component to be displayed as the back button. Used only if `backOption` is not defined */
  backComponent?: React.ReactNode;
  badgeOptions?: BadgeOptions;
  children?: React.ReactNode;
  rightSideItems?: React.ReactNode[];
  subtitle?: SubtitleProps['items'];
  subtitle2?: SubtitleProps['items'];
  title: TitleProp;
  titleNode?: React.ReactElement;
}

export const HeaderLinkBack: React.FC<{ backOptions: BackOptions }> = React.memo(
  ({ backOptions }) => {
    const { navigateToUrl } = useKibana().services.application;
    const { formatUrl } = useFormatUrl(backOptions.pageId);

    const backUrl = formatUrl(backOptions.path ?? '');
    return (
      <LinkBack>
        <LinkIcon
          dataTestSubj={backOptions.dataTestSubj ?? 'link-back'}
          onClick={(ev: Event) => {
            ev.preventDefault();
            navigateToUrl(backUrl);
          }}
          href={backUrl}
          iconType="arrowLeft"
        >
          {backOptions.text}
        </LinkIcon>
      </LinkBack>
    );
  }
);
HeaderLinkBack.displayName = 'HeaderLinkBack';

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  backOptions,
  backComponent,
  badgeOptions,
  border,
  children,
  isLoading,
  rightSideItems,
  subtitle,
  subtitle2,
  title,
  titleNode,
}) => (
  <>
    <EuiPageHeader alignItems="center" rightSideItems={rightSideItems}>
      <HeaderSection>
        {backOptions && <HeaderLinkBack backOptions={backOptions} />}
        {!backOptions && backComponent && <>{backComponent}</>}

        {titleNode || <Title title={title} badgeOptions={badgeOptions} />}

        {subtitle && (
          <>
            <EuiSpacer size="s" />
            <Subtitle data-test-subj="header-page-subtitle" items={subtitle} />
          </>
        )}
        {border && isLoading && <EuiProgress size="xs" color="accent" />}
      </HeaderSection>

      {children && (
        <EuiPageHeaderSection data-test-subj="header-page-supplements">
          {children}
        </EuiPageHeaderSection>
      )}
    </EuiPageHeader>
    {subtitle2 && (
      <>
        <EuiSpacer size="xs" />
        <Subtitle data-test-subj="header-page-subtitle-2" items={subtitle2} />
      </>
    )}
    {border && (
      <>
        <EuiSpacer size="m" />
        <Divider />
      </>
    )}
    {/* Manually add a 'padding-bottom' to header */}
    <EuiSpacer size="l" />
  </>
);

export const HeaderPage = React.memo(HeaderPageComponent);
