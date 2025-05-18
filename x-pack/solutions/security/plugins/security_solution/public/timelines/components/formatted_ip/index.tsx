/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, isString, uniq } from 'lodash/fp';
import React, { useCallback, useContext, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { getOrEmptyTagFromValue } from '../../../common/components/empty_value';
import { NetworkDetailsLink } from '../../../common/components/links';
import { NetworkPanelKey } from '../../../flyout/network_details';

const tryStringify = (value: string | object | null | undefined): string => {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return `${value}`;
  }
};

const NonDecoratedIpComponent: React.FC<{
  value: string | object | null | undefined;
}> = ({ value }) => {
  const content = useMemo(
    () =>
      typeof value !== 'object'
        ? getOrEmptyTagFromValue(value)
        : getOrEmptyTagFromValue(tryStringify(value)),
    [value]
  );

  return content;
};

const NonDecoratedIp = React.memo(NonDecoratedIpComponent);

interface AddressLinksItemProps extends Omit<AddressLinksProps, 'addresses'> {
  address: string;
}

const AddressLinksItemComponent: React.FC<AddressLinksItemProps> = ({
  address,
  Component,
  fieldName,
  isButton,
  onClick,
  title,
}) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const eventContext = useContext(StatefulEventContext);
  const isInTimelineContext =
    address && eventContext?.enableIpDetailsFlyout && eventContext?.timelineID;

  const openNetworkDetailsSidePanel = useCallback(
    (ip: string) => {
      if (onClick) {
        onClick();
      }

      if (eventContext && isInTimelineContext) {
        openFlyout({
          right: {
            id: NetworkPanelKey,
            params: {
              ip,
              scopeId: eventContext.timelineID,
              flowTarget: fieldName.includes(FlowTargetSourceDest.destination)
                ? FlowTargetSourceDest.destination
                : FlowTargetSourceDest.source,
            },
          },
        });
      }
    },
    [onClick, eventContext, isInTimelineContext, fieldName, openFlyout]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the IP Overview page
  const content = useMemo(
    () =>
      Component ? (
        <NetworkDetailsLink
          Component={Component}
          ip={address}
          isButton={isButton}
          onClick={isInTimelineContext ? openNetworkDetailsSidePanel : undefined}
          title={title}
        />
      ) : (
        <NetworkDetailsLink
          Component={Component}
          ip={address}
          isButton={isButton}
          onClick={isInTimelineContext ? openNetworkDetailsSidePanel : undefined}
          title={title}
        />
      ),
    [Component, address, isButton, isInTimelineContext, openNetworkDetailsSidePanel, title]
  );

  return content;
};

const AddressLinksItem = React.memo(AddressLinksItemComponent);

interface AddressLinksProps {
  addresses: string[];
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  fieldName: string;
  isButton?: boolean;
  onClick?: () => void;
  title?: string;
}

const AddressLinksComponent: React.FC<AddressLinksProps> = ({
  addresses,
  Component,
  fieldName,
  isButton,
  onClick,
  title,
}) => {
  const uniqAddresses = useMemo(() => uniq(addresses), [addresses]);

  const content = useMemo(
    () =>
      uniqAddresses.map((address) => (
        <AddressLinksItem
          key={address}
          address={address}
          Component={Component}
          fieldName={fieldName}
          isButton={isButton}
          onClick={onClick}
          title={title}
        />
      )),
    [Component, fieldName, isButton, onClick, title, uniqAddresses]
  );

  return <>{content}</>;
};

const AddressLinks = React.memo(
  AddressLinksComponent,
  (prevProps, nextProps) =>
    prevProps.fieldName === nextProps.fieldName &&
    deepEqual(prevProps.addresses, nextProps.addresses)
);

const FormattedIpComponent: React.FC<{
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  fieldName: string;
  isButton?: boolean;
  onClick?: () => void;
  title?: string;
  value: string | object | null | undefined;
}> = ({ Component, fieldName, isButton, onClick, title, value }) => {
  if (isString(value) && !isEmpty(value)) {
    try {
      const addresses = JSON.parse(value);
      if (isArray(addresses)) {
        return (
          <AddressLinks
            addresses={addresses}
            Component={Component}
            fieldName={fieldName}
            isButton={isButton}
            onClick={onClick}
            title={title}
          />
        );
      }
    } catch (_) {
      // fall back to formatting it as a single link
    }

    // return a single draggable link
    return (
      <AddressLinks
        addresses={[value]}
        Component={Component}
        isButton={isButton}
        onClick={onClick}
        fieldName={fieldName}
        title={title}
      />
    );
  } else {
    return <NonDecoratedIp value={value} />;
  }
};

export const FormattedIp = React.memo(
  FormattedIpComponent,
  (prevProps, nextProps) =>
    prevProps.fieldName === nextProps.fieldName && deepEqual(prevProps.value, nextProps.value)
);
