/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip } from '@elastic/eui';
import type { SyntheticEvent, MouseEvent } from 'react';
import React, { useMemo, useCallback } from 'react';
import { isArray, isNil } from 'lodash/fp';
import type { NavigateToAppOptions } from '@kbn/core-application-browser';
import { EntityType } from '../../../../common/entity_analytics/types';
import { IP_REPUTATION_LINKS_SETTING, APP_UI_ID } from '../../../../common/constants';
import { encodeIpv6 } from '../../lib/helpers';
import {
  getCaseDetailsUrl,
  getHostDetailsUrl,
  getTabsOnHostDetailsUrl,
  getNetworkDetailsUrl,
  getCreateCaseUrl,
  useFormatUrl,
} from '../link_to';
import type { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { FlowTarget } from '../../../../common/search_strategy/security_solution/network';
import { useUiSetting$, useKibana } from '../../lib/kibana';
import { isUrlInvalid } from '../../utils/validators';

import * as i18n from './translations';
import { SecurityPageName } from '../../../app/types';
import { getTabsOnUsersDetailsUrl, getUsersDetailsUrl } from '../link_to/redirect_to_users';
import type { ReputationLinkSetting, ReputationLinkOverflowProps } from './helpers';
import {
  LinkAnchor,
  GenericLinkButton,
  PortContainer,
  Comma,
  LinkButton,
  ReputationLinksOverflow,
} from './helpers';
import type { HostsTableType } from '../../../explore/hosts/store/model';
import type { UsersTableType } from '../../../explore/users/store/model';
import { useGetSecuritySolutionLinkProps, withSecuritySolutionLink } from './link_props';
import { EntityEventTypes } from '../../lib/telemetry';

export { useSecuritySolutionLinkProps, type GetSecuritySolutionLinkProps } from './link_props';
export { LinkButton, LinkAnchor } from './helpers';

export { useGetSecuritySolutionLinkProps, withSecuritySolutionLink };

export const DEFAULT_NUMBER_OF_LINK = 5;

/** The default max-height of the Reputation Links popover used to show "+n More" items (e.g. `+9 More`) */
export const DEFAULT_MORE_MAX_HEIGHT = '200px';

// Internal Links
const UserDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  userName: string;
  userTab?: UsersTableType;
  title?: string;
  isButton?: boolean;
  onClick?: (e: SyntheticEvent) => void;
}> = ({ children, Component, userName, isButton, onClick: onClickParam, title, userTab }) => {
  const encodedUserName = encodeURIComponent(userName);
  const { formatUrl, search } = useFormatUrl(SecurityPageName.users);
  const {
    application: { navigateToApp },
    telemetry,
  } = useKibana().services;
  const goToUsersDetails = useCallback(
    (ev: SyntheticEvent) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.users,
        path: userTab
          ? getTabsOnUsersDetailsUrl(encodedUserName, userTab, search)
          : getUsersDetailsUrl(encodedUserName, search),
      });
    },
    [encodedUserName, navigateToApp, search, userTab]
  );

  const href = useMemo(
    () =>
      formatUrl(
        userTab
          ? getTabsOnUsersDetailsUrl(encodedUserName, userTab)
          : getUsersDetailsUrl(encodedUserName)
      ),
    [formatUrl, encodedUserName, userTab]
  );

  const onClick = useCallback(
    (e: SyntheticEvent) => {
      telemetry.reportEvent(EntityEventTypes.EntityDetailsClicked, { entity: EntityType.user });
      const callback = onClickParam ?? goToUsersDetails;
      callback(e);
    },
    [goToUsersDetails, onClickParam, telemetry]
  );

  return isButton ? (
    <GenericLinkButton
      Component={Component}
      dataTestSubj="data-grid-user-details"
      href={href}
      onClick={onClick}
      title={title ?? userName}
    >
      {children ? children : userName}
    </GenericLinkButton>
  ) : (
    <LinkAnchor data-test-subj="users-link-anchor" onClick={onClick} href={href}>
      {children ? children : userName}
    </LinkAnchor>
  );
};

export const UserDetailsLink = React.memo(UserDetailsLinkComponent);

const ServiceDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  serviceName?: string;
  onClick?: (e: SyntheticEvent) => void;
}> = ({ children, onClick: onClickParam, serviceName }) => {
  const { telemetry } = useKibana().services;

  const onClick = useCallback(
    (e: SyntheticEvent) => {
      telemetry.reportEvent(EntityEventTypes.EntityDetailsClicked, { entity: EntityType.service });
      if (onClickParam) {
        onClickParam(e);
      }
    },
    [onClickParam, telemetry]
  );

  return onClickParam ? (
    <LinkAnchor data-test-subj="service-link-anchor" onClick={onClick}>
      {children ? children : serviceName}
    </LinkAnchor>
  ) : (
    serviceName
  );
};

export const ServiceDetailsLink = React.memo(ServiceDetailsLinkComponent);

export interface HostDetailsLinkProps {
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  hostName: string;
  isButton?: boolean;
  onClick?: (e: SyntheticEvent) => void;
  hostTab?: HostsTableType;
  title?: string;
}
const HostDetailsLinkComponent: React.FC<HostDetailsLinkProps> = ({
  children,
  Component,
  hostName,
  isButton,
  onClick: onClickParam,
  title,
  hostTab,
}) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.hosts);
  const {
    application: { navigateToApp },
    telemetry,
  } = useKibana().services;

  const encodedHostName = encodeURIComponent(hostName);

  const goToHostDetails = useCallback(
    (ev: SyntheticEvent) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
        path: hostTab
          ? getTabsOnHostDetailsUrl(encodedHostName, hostTab, search)
          : getHostDetailsUrl(encodedHostName, search),
      });
    },
    [encodedHostName, navigateToApp, search, hostTab]
  );
  const href = useMemo(
    () =>
      formatUrl(
        hostTab
          ? getTabsOnHostDetailsUrl(encodedHostName, hostTab)
          : getHostDetailsUrl(encodedHostName)
      ),
    [formatUrl, encodedHostName, hostTab]
  );

  const onClick = useCallback(
    (e: SyntheticEvent) => {
      telemetry.reportEvent(EntityEventTypes.EntityDetailsClicked, { entity: EntityType.host });

      const callback = onClickParam ?? goToHostDetails;
      callback(e);
    },
    [goToHostDetails, onClickParam, telemetry]
  );

  return isButton ? (
    <GenericLinkButton
      Component={Component}
      dataTestSubj="data-grid-host-details"
      href={href}
      iconType="expand"
      onClick={onClick}
      title={title ?? hostName}
    >
      {children}
    </GenericLinkButton>
  ) : (
    <LinkAnchor onClick={onClick} href={href} data-test-subj="host-details-button">
      {children ? children : hostName}
    </LinkAnchor>
  );
};

export const HostDetailsLink = React.memo(HostDetailsLinkComponent);

export interface EntityDetailsLinkProps {
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  entityName: string;
  isButton?: boolean;
  onClick?: (e: SyntheticEvent) => void;
  tab?: HostsTableType | UsersTableType;
  title?: string;
  entityType: EntityType;
}
export const EntityDetailsLink = ({
  entityType,
  tab,
  entityName,
  ...props
}: EntityDetailsLinkProps) => {
  if (entityType === EntityType.host) {
    return <HostDetailsLink {...props} hostTab={tab as HostsTableType} hostName={entityName} />;
  } else if (entityType === EntityType.user) {
    return <UserDetailsLink {...props} userTab={tab as UsersTableType} userName={entityName} />;
  } else if (entityType === EntityType.service) {
    return <ServiceDetailsLink serviceName={entityName} onClick={props.onClick} />;
  }

  return entityName;
};

const allowedUrlSchemes = ['http://', 'https://'];
export const ExternalLink = React.memo<{
  url: string;
  children?: React.ReactNode;
  idx?: number;
  overflowIndexStart?: number;
  allItemsLimit?: number;
}>(
  ({
    url,
    children,
    idx,
    overflowIndexStart = DEFAULT_NUMBER_OF_LINK,
    allItemsLimit = DEFAULT_NUMBER_OF_LINK,
  }) => {
    const lastVisibleItemIndex = overflowIndexStart - 1;
    const lastItemIndex = allItemsLimit - 1;
    const lastIndexToShow = Math.max(0, Math.min(lastVisibleItemIndex, lastItemIndex));
    const inAllowlist = allowedUrlSchemes.some((scheme) => url.indexOf(scheme) === 0);
    return url && inAllowlist && !isUrlInvalid(url) && children ? (
      <EuiToolTip content={url} position="top" data-test-subj="externalLinkTooltip">
        <>
          <EuiLink href={url} target="_blank" rel="noopener" data-test-subj="externalLink">
            {children}
          </EuiLink>
          {!isNil(idx) && idx < lastIndexToShow && <Comma data-test-subj="externalLinkComma" />}
        </>
      </EuiToolTip>
    ) : null;
  }
);

ExternalLink.displayName = 'ExternalLink';

export interface NetworkDetailsLinkProps {
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  ip: string | string[];
  flowTarget?: FlowTarget | FlowTargetSourceDest;
  isButton?: boolean;
  onClick?: (ip: string) => void;
  title?: string;
}

const NetworkDetailsLinkComponent: React.FC<NetworkDetailsLinkProps> = ({ ip, ...restProps }) => {
  // We see that sometimes the `ip` is passed as a string value of "IP1,IP2".
  // Therefore we're breaking up this string into individual IPs first.
  const actualIp = useMemo(() => {
    if (typeof ip === 'string' && ip.includes(',')) {
      return ip.split(',').map((str) => str.trim());
    } else {
      return ip;
    }
  }, [ip]);

  return isArray(actualIp) ? (
    actualIp.map((currentIp, index) => (
      <span key={`${currentIp}-${index}`}>
        <IpLinkComponent ip={currentIp} {...restProps} />
        {index === actualIp.length - 1 ? '' : ', '}
      </span>
    ))
  ) : (
    <IpLinkComponent ip={actualIp} {...restProps} />
  );
};

export const NetworkDetailsLink = React.memo(NetworkDetailsLinkComponent);

type IpLinkComponentProps = Omit<NetworkDetailsLinkProps, 'ip'> & { ip: string };

const IpLinkComponent: React.FC<IpLinkComponentProps> = ({
  isButton,
  onClick,
  ip: ipAddress,
  flowTarget = FlowTarget.source,
  Component,
  title,
  children,
}) => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { onClick: onClickNavigation, href } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.network,
    path: getNetworkDetailsUrl(encodeURIComponent(encodeIpv6(ipAddress)), flowTarget),
  });

  const onLinkClick = useCallback(
    (e: SyntheticEvent) => {
      if (onClick) {
        e.preventDefault();
        onClick(ipAddress);
      } else {
        onClickNavigation(e as MouseEvent);
      }
    },
    [onClick, onClickNavigation, ipAddress]
  );

  return isButton ? (
    <GenericLinkButton
      Component={Component}
      key={ipAddress}
      dataTestSubj="data-grid-network-details"
      onClick={onLinkClick}
      href={href}
      title={title ?? ipAddress}
    >
      {children}
    </GenericLinkButton>
  ) : (
    <LinkAnchor key={ipAddress} onClick={onLinkClick} href={href} data-test-subj="network-details">
      {children ? children : ipAddress}
    </LinkAnchor>
  );
};

export interface CaseDetailsLinkComponentProps {
  children?: React.ReactNode;
  /**
   * Will be used to construct case url
   */
  detailName: string;
  /**
   * Link title
   */
  title?: string;
  /**
   * If true, will open the app in new tab, will share session information via window.open if base
   */
  openInNewTab?: NavigateToAppOptions['openInNewTab'];
}

const CaseDetailsLinkComponent: React.FC<CaseDetailsLinkComponentProps> = ({
  children,
  detailName,
  title,
  openInNewTab = false,
}) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { navigateToApp } = useKibana().services.application;

  const goToCaseDetails = useCallback(
    async (ev?: SyntheticEvent) => {
      if (ev) ev.preventDefault();
      return navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
        path: getCaseDetailsUrl({ id: detailName, search }),
        openInNewTab,
      });
    },
    [detailName, navigateToApp, openInNewTab, search]
  );

  return (
    <LinkAnchor
      onClick={goToCaseDetails}
      href={formatUrl(getCaseDetailsUrl({ id: detailName }))}
      data-test-subj="case-details-link"
      aria-label={i18n.CASE_DETAILS_LINK_ARIA(title ?? detailName)}
    >
      {children ? children : detailName}
    </LinkAnchor>
  );
};
export const CaseDetailsLink = React.memo(CaseDetailsLinkComponent);
CaseDetailsLink.displayName = 'CaseDetailsLink';

export const CreateCaseLink = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { navigateToApp } = useKibana().services.application;
  const goToCreateCase = useCallback(
    async (ev: SyntheticEvent) => {
      ev.preventDefault();
      return navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
        path: getCreateCaseUrl(search),
      });
    },
    [navigateToApp, search]
  );
  return (
    <LinkAnchor onClick={goToCreateCase} href={formatUrl(getCreateCaseUrl())}>
      {children}
    </LinkAnchor>
  );
});

CreateCaseLink.displayName = 'CreateCaseLink';

// External Links
export const GoogleLink = React.memo<{ children?: React.ReactNode; link: string }>(
  ({ children, link }) => {
    const url = useMemo(
      () => `https://www.google.com/search?q=${encodeURIComponent(link)}`,
      [link]
    );
    return <ExternalLink url={url}>{children ? children : link}</ExternalLink>;
  }
);

GoogleLink.displayName = 'GoogleLink';

export const PortOrServiceNameLink = React.memo<{
  children?: React.ReactNode;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  portOrServiceName: number | string;
  onClick?: (e: SyntheticEvent) => void | undefined;
  title?: string;
}>(({ Component, title, children, portOrServiceName }) => {
  const href = useMemo(
    () =>
      `https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=${encodeURIComponent(
        String(portOrServiceName)
      )}`,
    [portOrServiceName]
  );
  return Component ? (
    <Component
      href={href}
      data-test-subj="data-grid-port-or-service-name-link"
      title={title}
      iconType="link"
    >
      {title ?? children ?? portOrServiceName}
    </Component>
  ) : (
    <PortContainer>
      <EuiLink data-test-subj="port-or-service-name-link" href={href} target="_blank">
        {children ? children : portOrServiceName}
      </EuiLink>
    </PortContainer>
  );
});

PortOrServiceNameLink.displayName = 'PortOrServiceNameLink';

export const Ja3FingerprintLink = React.memo<{
  children?: React.ReactNode;
  ja3Fingerprint: string;
}>(({ children, ja3Fingerprint }) => {
  const href = useMemo(
    () => `https://sslbl.abuse.ch/ja3-fingerprints/${encodeURIComponent(ja3Fingerprint)}`,
    [ja3Fingerprint]
  );
  return (
    <EuiLink data-test-subj="ja3-fingerprint-link" href={href} target="_blank">
      {children ? children : ja3Fingerprint}
    </EuiLink>
  );
});

Ja3FingerprintLink.displayName = 'Ja3FingerprintLink';

export const CertificateFingerprintLink = React.memo<{
  children?: React.ReactNode;
  certificateFingerprint: string;
}>(({ children, certificateFingerprint }) => {
  const href = useMemo(
    () =>
      `https://sslbl.abuse.ch/ssl-certificates/sha1/${encodeURIComponent(certificateFingerprint)}`,
    [certificateFingerprint]
  );
  return (
    <EuiLink data-test-subj="certificate-fingerprint-link" href={href} target="_blank">
      {children ? children : certificateFingerprint}
    </EuiLink>
  );
});

CertificateFingerprintLink.displayName = 'CertificateFingerprintLink';

enum DefaultReputationLink {
  'virustotal.com' = 'virustotal.com',
  'talosIntelligence.com' = 'talosIntelligence.com',
}

function isDefaultReputationLink(name: string): name is DefaultReputationLink {
  return (
    name === DefaultReputationLink['virustotal.com'] ||
    name === DefaultReputationLink['talosIntelligence.com']
  );
}
const isReputationLink = (
  rowItem: string | ReputationLinkSetting
): rowItem is ReputationLinkSetting =>
  (rowItem as ReputationLinkSetting).url_template !== undefined &&
  (rowItem as ReputationLinkSetting).name !== undefined;

const defaultNameMapping: Record<DefaultReputationLink, string> = {
  [DefaultReputationLink['virustotal.com']]: i18n.VIEW_VIRUS_TOTAL,
  [DefaultReputationLink['talosIntelligence.com']]: i18n.VIEW_TALOS_INTELLIGENCE,
};

const ReputationLinkComponent: React.FC<{
  overflowIndexStart?: number;
  allItemsLimit?: number;
  showDomain?: boolean;
  domain: string;
  direction?: 'row' | 'column';
}> = ({
  overflowIndexStart = DEFAULT_NUMBER_OF_LINK,
  allItemsLimit = DEFAULT_NUMBER_OF_LINK,
  showDomain = false,
  domain,
  direction = 'row',
}) => {
  const [ipReputationLinksSetting] = useUiSetting$<ReputationLinkSetting[]>(
    IP_REPUTATION_LINKS_SETTING
  );

  const ipReputationLinks: ReputationLinkSetting[] = useMemo(
    () =>
      ipReputationLinksSetting
        ?.slice(0, allItemsLimit)
        .filter(
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ({ url_template, name }) =>
            !isNil(url_template) && !isNil(name) && !isUrlInvalid(url_template)
        )
        // eslint-disable-next-line @typescript-eslint/naming-convention
        .map(({ name, url_template }: { name: string; url_template: string }) => ({
          name: isDefaultReputationLink(name) ? defaultNameMapping[name] : name,
          url_template: url_template.replace(`{{ip}}`, encodeURIComponent(domain)),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ipReputationLinksSetting, domain, defaultNameMapping, allItemsLimit]
  );

  const renderCallback: NonNullable<ReputationLinkOverflowProps['render']> = useCallback(
    (rowItem) =>
      isReputationLink(rowItem) && (
        <ExternalLink
          url={rowItem.url_template}
          overflowIndexStart={overflowIndexStart}
          allItemsLimit={allItemsLimit}
        >
          <>{rowItem.name ?? domain}</>
        </ExternalLink>
      ),
    [allItemsLimit, domain, overflowIndexStart]
  );

  return ipReputationLinks?.length > 0 ? (
    <section>
      <EuiFlexGroup
        gutterSize="none"
        justifyContent="center"
        direction={direction}
        alignItems="center"
        data-test-subj="reputationLinkGroup"
      >
        <EuiFlexItem grow={true}>
          {ipReputationLinks
            ?.slice(0, overflowIndexStart)
            .map(({ name, url_template: urlTemplate }: ReputationLinkSetting, id) => (
              <ExternalLink
                allItemsLimit={ipReputationLinks.length}
                idx={id}
                overflowIndexStart={overflowIndexStart}
                url={urlTemplate}
                data-test-subj="externalLinkComponent"
                key={`reputationLink-${id}`}
              >
                <>{showDomain ? domain : name ?? domain}</>
              </ExternalLink>
            ))}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <ReputationLinksOverflow
            rowItems={ipReputationLinks}
            render={renderCallback}
            moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
            overflowIndexStart={overflowIndexStart}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </section>
  ) : null;
};

ReputationLinkComponent.displayName = 'ReputationLinkComponent';

export const ReputationLink = React.memo(ReputationLinkComponent);

export const WhoIsLink = React.memo<{ children?: React.ReactNode; domain: string }>(
  ({ children, domain }) => {
    const url = useMemo(
      () => `https://www.iana.org/whois?q=${encodeURIComponent(domain)}`,
      [domain]
    );
    return <ExternalLink url={url}>{children ? children : domain}</ExternalLink>;
  }
);

WhoIsLink.displayName = 'WhoIsLink';

/**
 * Security Solutions internal link button.
 *
 * `<SecuritySolutionLinkButton deepLinkId={SecurityPageName.hosts} />;`
 */
export const SecuritySolutionLinkButton = withSecuritySolutionLink(LinkButton);

/**
 * Security Solutions internal link anchor.
 *
 * `<SecuritySolutionLinkAnchor deepLinkId={SecurityPageName.hosts} />;`
 */
export const SecuritySolutionLinkAnchor = withSecuritySolutionLink(LinkAnchor);
