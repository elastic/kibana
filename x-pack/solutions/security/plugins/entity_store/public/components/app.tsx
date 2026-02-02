/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

import { PLUGIN_NAME } from '../../common';

interface FeatureFlagsExampleAppDeps {
  http: CoreStart['http'];
}

export const EntityStoreApp = ({ http }: FeatureFlagsExampleAppDeps) => {
  const [res, setRes] = React.useState<string>('');

  useEffect(() => {
    let isMounted = true;
    http
      .get('/internal/entity-store', {
        asResponse: true,
        version: '1',
      })
      .then((response) => {
        if (isMounted) {
          setRes(JSON.stringify(response.body));
        }
      })
      .catch(() => {
        if (isMounted) {
          setRes('Error loading data');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [http]);

  return (
    <>
      <EuiPageTemplate>
        <EuiPageTemplate.Header>
          <EuiTitle size="l">
            <h1>{PLUGIN_NAME}</h1>
          </EuiTitle>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <h2>Response from entity store plugin {res}</h2>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
