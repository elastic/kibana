/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { EuiSpacer, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NavigationProvider } from '../context';
import { LinkButton } from '../../links';

export const renderIntegrationsLinkCallout = (core: CoreStart) => {
  return (
    <>
      <EuiSpacer />
      <EuiCallOut
        iconType="cluster"
        title={i18n.translate('securitySolutionPackages.integrationsCallout.title', {
          defaultMessage: 'Integrations',
        })}
      >
        <p>
          {i18n.translate('securitySolutionPackages.integrationsCallout.body', {
            defaultMessage: 'Choose an integration to start collecting and analyzing your data.',
          })}
        </p>
        <EuiFlexGroup>
          <EuiFlexItem>
            <NavigationProvider core={core}>
              <LinkButton app="integrations" path="/browse/security" fill>
                {i18n.translate('securitySolutionPackages.integrationsCallout.button', {
                  defaultMessage: 'Browse integrations',
                })}
              </LinkButton>
            </NavigationProvider>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    </>
  );
};
