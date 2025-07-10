/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useFooterStyles } from './onboarding_footer.styles';
import { useFooterItems } from './footer_items';
import type { OnboardingFooterLinkItemId } from './constants';
import { TELEMETRY_FOOTER_LINK } from './constants';
import { useOnboardingContext } from '../onboarding_context';

export const OnboardingFooter = React.memo(() => {
  const styles = useFooterStyles();
  const footerItems = useFooterItems();
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" className={styles}>
      {footerItems.map(({ id, title, icon, description, link }) => (
        <FooterLinkItem
          id={id}
          key={`footer-${id}`}
          title={title}
          icon={icon}
          description={description}
          link={link}
        />
      ))}
    </EuiFlexGroup>
  );
});
OnboardingFooter.displayName = 'OnboardingFooter';

interface FooterLinkItemProps {
  id: OnboardingFooterLinkItemId;
  title: string;
  icon: string;
  description: string;
  link: { href: string; title: string };
}

export const FooterLinkItem = React.memo<FooterLinkItemProps>(
  ({ id, title, icon, description, link }) => {
    const {
      telemetry: { reportLinkClick },
    } = useOnboardingContext();

    const onClickWithReport = useCallback<React.MouseEventHandler>(() => {
      reportLinkClick?.(`${TELEMETRY_FOOTER_LINK}_${id}`);
    }, [id, reportLinkClick]);

    return (
      <EuiFlexItem>
        <EuiPanel
          color="plain"
          grow={false}
          borderRadius="m"
          paddingSize="none"
          hasBorder={true}
          className="itemPanel"
        >
          <span className="itemIconWrapper">
            <EuiIcon type={icon} className="itemIcon" />
          </span>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs" className="itemTitle">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{description}</EuiText>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiLink
              data-test-subj="footerLinkItem"
              onClick={onClickWithReport}
              href={link.href}
              target="_blank"
            >
              {link.title}
            </EuiLink>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    );
  }
);

FooterLinkItem.displayName = 'FooterLinkItem';
