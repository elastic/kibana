/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';

import * as i18n from './translations';

import ScheduleIconSVG from '../icons/schedule.svg';
import { CreateFlyout } from '../create_flyout';

export const EmptyPage: React.FC = React.memo(() => {
  // showing / hiding the flyout:
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const openFlyout = useCallback(() => setShowFlyout(true), []);
  const onClose = useCallback(() => setShowFlyout(false), []);

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="center" data-test-subj="emptySchedule">
        <EuiFlexItem grow={false}>
          <EuiPanel
            hasShadow={false}
            css={css`
              text-align: center;
            `}
          >
            <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
              <EuiFlexItem grow={false}>
                <EuiImage
                  size="128"
                  src={ScheduleIconSVG}
                  alt={i18n.SCHEDULE_ATTACK_DISCOVERY_ALT}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <h2>{i18n.EMPTY_PAGE_TITLE}</h2>
                  <p>{i18n.EMPTY_PAGE_DESCRIPTION}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="createSchedule"
                  fill
                  onClick={openFlyout}
                  size="m"
                  iconType="plusInCircle"
                >
                  {i18n.CREATE_SCHEDULE}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  external={true}
                  data-test-subj="learnMoreLink"
                  href="https://www.elastic.co/guide/en/security/current/attack-discovery.html"
                  target="_blank"
                >
                  {i18n.LEARN_MORE}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showFlyout && <CreateFlyout onClose={onClose} />}
    </>
  );
});
EmptyPage.displayName = 'EmptyPage';
