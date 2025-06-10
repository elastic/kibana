/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SyntheticEvent, PropsWithChildren } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import type {
  EuiButtonIcon,
  EuiButtonProps,
  EuiLinkProps,
  PropsForAnchor,
  PropsForButton,
} from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { FormattedMessage } from '@kbn/i18n-react';
import { defaultToEmptyTag } from '../empty_value';
export interface ReputationLinkSetting {
  name: string;
  url_template: string;
}
export const LinkButton: React.FC<
  PropsWithChildren<PropsForButton<EuiButtonProps> | PropsForAnchor<EuiButtonProps>>
> = ({ children, ...props }) => <EuiButton {...props}>{children}</EuiButton>;

export const LinkAnchor: React.FC<PropsWithChildren<EuiLinkProps>> = ({ children, ...props }) => (
  <EuiLink {...props}>{children}</EuiLink>
);

export const Comma = styled('span')`
  margin-right: 5px;
  margin-left: 5px;
  &::after {
    content: ' ,';
  }
`;

Comma.displayName = 'Comma';

const GenericLinkButtonComponent: React.FC<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  dataTestSubj?: string;
  href: string;
  onClick?: (e: SyntheticEvent) => void;
  title?: string;
  iconType?: string;
}> = ({ children, Component, dataTestSubj, href, onClick, title, iconType = 'expand' }) => {
  return Component ? (
    <Component
      data-test-subj={dataTestSubj}
      href={href}
      iconType={iconType}
      onClick={onClick}
      title={title}
    >
      {title ?? children}
    </Component>
  ) : (
    <LinkButton data-test-subj={dataTestSubj} href={href} onClick={onClick}>
      {title ?? children}
    </LinkButton>
  );
};

export const GenericLinkButton = React.memo(GenericLinkButtonComponent);

export const PortContainer = styled.div`
  & svg {
    position: relative;
    top: -1px;
  }
`;

export interface ReputationLinkOverflowProps {
  rowItems: ReputationLinkSetting[];
  render?: (item: ReputationLinkSetting) => React.ReactNode;
  overflowIndexStart?: number;
  moreMaxHeight: string;
}

export const ReputationLinksOverflow = React.memo<ReputationLinkOverflowProps>(
  ({ moreMaxHeight, overflowIndexStart = 5, render, rowItems }) => {
    const [isOpen, setIsOpen] = useState(false);
    const togglePopover = useCallback(() => setIsOpen((currentIsOpen) => !currentIsOpen), []);
    const button = useMemo(
      () => (
        <>
          {' ,'}
          <EuiButtonEmpty size="xs" onClick={togglePopover}>
            {`+${rowItems.length - overflowIndexStart} `}
            <FormattedMessage
              id="xpack.securitySolution.reputationLinks.moreLabel"
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
            <MoreReputationLinksContainer
              render={render}
              rowItems={rowItems}
              moreMaxHeight={moreMaxHeight}
              overflowIndexStart={overflowIndexStart}
            />
          </EuiPopover>
        )}
      </EuiFlexItem>
    );
  }
);

ReputationLinksOverflow.displayName = 'ReputationLinksOverflow';

export const MoreReputationLinksContainer = React.memo<ReputationLinkOverflowProps>(
  ({ moreMaxHeight, overflowIndexStart, render, rowItems }) => {
    const moreItems = useMemo(
      () =>
        rowItems.slice(overflowIndexStart).map((rowItem, index) => {
          return (
            <EuiFlexItem grow={1} key={`${rowItem}-${index}`}>
              {(render && render(rowItem)) ?? defaultToEmptyTag(rowItem)}
            </EuiFlexItem>
          );
        }),
      [overflowIndexStart, render, rowItems]
    );

    return (
      <div
        data-test-subj="more-container"
        className="eui-yScroll"
        style={{
          maxHeight: moreMaxHeight,
          paddingRight: '2px',
        }}
      >
        <EuiFlexGroup gutterSize="s" direction="column" data-test-subj="overflow-items">
          {moreItems}
        </EuiFlexGroup>
      </div>
    );
  }
);
MoreReputationLinksContainer.displayName = 'MoreReputationLinksContainer';
