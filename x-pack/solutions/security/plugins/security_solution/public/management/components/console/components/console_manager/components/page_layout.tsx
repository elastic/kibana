/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren, ReactNode } from 'react';
import React, { memo, useMemo } from 'react';
import type { EuiPanelProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled from '@emotion/styled';
import classnames from 'classnames';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

const EuiPanelStyled = styled(EuiPanel)`
  &.full-height,
  .full-height {
    height: 100%;
  }

  .is-not-scrollable {
    overflow: hidden;
  }

  .is-scrollable {
    overflow: auto;
  }
`;

export type PageLayoutProps = PropsWithChildren<{
  /** Rendered above the console body (eg. host banners/callouts). */
  pageBody?: ReactNode;
  paddingSize?: EuiPanelProps['paddingSize'];
  scrollableBody?: boolean;
  'data-test-subj'?: string;
}>;

/**
 * The console overlay's content area: an optional `pageBody` (eg. banners/callouts) above the full
 * height/non-scrollable console itself. The overlay's header lives outside this component (see
 * `ConsolePageOverlay`, which renders `AppHeaderView` above this layout) - this component owns only
 * the padded content section below it.
 */
export const PageLayout = memo<PageLayoutProps>(
  ({
    pageBody,
    paddingSize = 'l',
    scrollableBody = false,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const consoleBodyClassName = useMemo(() => {
      return classnames({
        'is-scrollable': scrollableBody,
        'is-not-scrollable': !scrollableBody,
        'full-height': true,
      });
    }, [scrollableBody]);

    return (
      <EuiPanelStyled
        hasShadow={false}
        hasBorder={false}
        paddingSize={paddingSize}
        data-test-subj={dataTestSubj}
        className="full-height"
        color="transparent"
      >
        <EuiFlexGroup
          direction="column"
          responsive={false}
          gutterSize="none"
          className="full-height"
          data-test-subj={getTestId('root')}
        >
          {pageBody && <EuiFlexItem grow={false}>{pageBody}</EuiFlexItem>}
          <EuiFlexItem
            grow
            className={consoleBodyClassName}
            data-test-subj={getTestId('consoleBody')}
          >
            <div role="main" className="full-height">
              {children}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanelStyled>
    );
  }
);
PageLayout.displayName = 'PageLayout';
