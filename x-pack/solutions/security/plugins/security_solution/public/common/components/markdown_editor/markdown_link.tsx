/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiLinkAnchorProps } from '@elastic/eui';
import { EuiLink, EuiToolTip } from '@elastic/eui';
import { useKibana } from '../../lib/kibana';

type MarkdownLinkProps = { disableLinks?: boolean } & EuiLinkAnchorProps;

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

// App-internal links are authored without Kibana's server base path (e.g. `/app/security/...`).
// Protocol-relative (`//host`) and absolute (`https://`, `mailto:`) URLs are external and must be
// left untouched.
const isAppInternalHref = (href?: string): href is string =>
  typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

const MarkdownLinkComponent: React.FC<MarkdownLinkProps> = ({
  disableLinks,
  href,
  target,
  children,
  ...props
}) => {
  const {
    services: { http },
  } = useKibana();
  const basePath = http?.basePath;

  const resolvedHref = useMemo(() => {
    if (!isAppInternalHref(href) || !basePath) {
      return href;
    }

    // Guard against double-prepending when the href already carries the base path.
    const serverBasePath = basePath.get();
    if (serverBasePath && href.startsWith(`${serverBasePath}/`)) {
      return href;
    }

    return basePath.prepend(href);
  }, [href, basePath]);

  return (
    <EuiToolTip content={resolvedHref}>
      <EuiLink
        href={disableLinks ? undefined : resolvedHref}
        data-test-subj="markdown-link"
        rel={`${REL_NOFOLLOW}`}
        target="_blank"
      >
        {children}
      </EuiLink>
    </EuiToolTip>
  );
};

export const MarkdownLink = memo(MarkdownLinkComponent);
