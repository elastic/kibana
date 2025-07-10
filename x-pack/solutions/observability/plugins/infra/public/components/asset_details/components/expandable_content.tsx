/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useToggle from 'react-use/lib/useToggle';
import type { Field } from '../tabs/metadata/utils';

interface ExpandableContentProps {
  fieldName?: string;
  values?: Field['value'];
}
export const ExpandableContent = (props: ExpandableContentProps) => {
  const { fieldName, values } = props;
  const [isExpanded, toggle] = useToggle(false);
  const showLessRef = useRef<HTMLAnchorElement | null>(null);
  const showMoreRef = useRef<HTMLAnchorElement | null>(null);

  const list = Array.isArray(values) ? values : [values];
  const [first, ...others] = list;
  const hasOthers = others.length > 0;
  const shouldShowMore = hasOthers && !isExpanded;
  const hasInteracted = useRef(false);

  const handleToggle = () => {
    hasInteracted.current = true;
    toggle();
  };

  useEffect(() => {
    if (!hasInteracted.current) return;

    if (isExpanded) {
      showLessRef.current?.focus();
    } else {
      showMoreRef.current?.focus();
    }
  }, [isExpanded]);

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="baseline" wrap direction="column">
      <EuiFlexItem className="eui-textTruncate">
        {shouldShowMore && (
          <>
            <EuiLink
              data-test-subj="infraAssetDetailsExpandableContentCountMoreLink"
              aria-label={i18n.translate('xpack.infra.assetDetails.metadata.seeMore.ariaLabel', {
                defaultMessage: 'See {count} more {fieldName}',
                values: { fieldName, count: others.length },
              })}
              onClick={handleToggle}
              ref={showMoreRef}
            >
              <FormattedMessage
                id="xpack.infra.assetDetails.tabs.metadata.seeMore"
                defaultMessage="+{count} more"
                values={{ count: others.length }}
              />
            </EuiLink>
          </>
        )}
        {hasOthers && isExpanded && (
          <EuiFlexItem>
            <EuiLink
              data-test-subj="infraExpandableContentShowLessLink"
              onClick={handleToggle}
              ref={showLessRef}
            >
              {i18n.translate('xpack.infra.assetDetails.tabs.metadata.seeLess', {
                defaultMessage: 'Show less',
              })}
            </EuiLink>
          </EuiFlexItem>
        )}
        <EuiToolTip delay="long" content={first}>
          <p className="eui-textTruncate">{first}</p>
        </EuiToolTip>
      </EuiFlexItem>
      {isExpanded && others.map((item, index) => <EuiFlexItem key={index}>{item}</EuiFlexItem>)}
    </EuiFlexGroup>
  );
};
