/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';
import { getScriptsDetailPath } from '../../../../common/url_routing';
import { useAppUrl } from '../../../../../common/lib/kibana';
import type { ScriptsLibraryTableProps } from './scripts_library_table';

export interface ScriptNameNavLinkProps {
  name: string;
  queryParams: ScriptsLibraryTableProps['queryParams'];
  scriptId: string;
  onClick: () => void;
  'data-test-subj'?: string;
}

export const ScriptNameNavLink = memo<ScriptNameNavLinkProps>(
  ({ name, queryParams, scriptId, onClick, 'data-test-subj': dataTestSubj }) => {
    const { getAppUrl } = useAppUrl();
    const toRoutePath = getScriptsDetailPath({
      query: { ...queryParams, selectedScriptId: scriptId, show: 'details' },
    });

    const href = getAppUrl({ path: toRoutePath });
    return (
      // eslint-disable-next-line @elastic/eui/href-or-on-click
      <EuiLink
        data-test-subj={`${dataTestSubj}-name-link`}
        className="eui-displayInline eui-textTruncate"
        href={href}
        onClick={onClick}
      >
        {name}
      </EuiLink>
    );
  }
);
ScriptNameNavLink.displayName = 'ScriptNameNavLink';
