/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../common';
import { getEndpointExceptionsListPath } from '../../../management/common/routing';

interface EndpointExceptionsMovedCalloutProps {
  id: string;
  dismissable: boolean;
  title: EndpointExceptionsMovedCalloutTitles;
}

type EndpointExceptionsMovedCalloutTitles =
  | 'moved'
  | 'noLongerEvaluatedOnRules'
  | 'cannotBeAddedToRules';

const TRANSLATIONS: Record<EndpointExceptionsMovedCalloutTitles, string> = {
  moved: i18n.translate('xpack.securitySolution.endpoint.exceptionsMovedCalloutTitle', {
    defaultMessage: 'Endpoint exceptions have moved.',
  }),

  noLongerEvaluatedOnRules: i18n.translate(
    'xpack.securitySolution.endpoint.exceptionsNotEvaluatedCalloutTitle',
    {
      defaultMessage:
        'Endpoint exceptions are no longer evaluated during detection rule execution.',
    }
  ),

  cannotBeAddedToRules: i18n.translate(
    'xpack.securitySolution.endpoint.exceptionsCannotBeAddedCalloutTitle',
    {
      defaultMessage: 'Endpoint Exceptions can no longer be added to detection rules.',
    }
  ),
};

export const EndpointExceptionsMovedCallout = React.memo(
  ({ id, dismissable, title }: EndpointExceptionsMovedCalloutProps) => {
    const { storage, application } = useKibana().services;
    const endpointExceptionsPath = getEndpointExceptionsListPath();
    const endpointExceptionsLink = application.getUrlForApp(APP_UI_ID, {
      path: endpointExceptionsPath,
    });

    const storageKey = `securitySolution.showEndpointExceptionsMovedCallout.${id}`;

    const [showCallout, setShowCallout] = useState(storage.get(storageKey) ?? true);

    const onCalloutDismiss = useCallback(() => {
      setShowCallout(false);
      storage.set(storageKey, false);
    }, [storage, storageKey]);

    if (!showCallout) {
      return null;
    }

    return (
      <>
        <EuiCallOut
          data-test-subj="EndpointExceptionsMovedCallout"
          title={TRANSLATIONS[title]}
          color="primary"
          iconType="info"
          onDismiss={dismissable ? onCalloutDismiss : undefined}
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.exceptionsMovedCallout.message"
            defaultMessage="Endpoint exceptions are now managed from the {artifacts} page."
            values={{
              artifacts: (
                <EuiLink href={endpointExceptionsLink}>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.exceptionsMovedCallout.link"
                    defaultMessage="Artifacts"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>

        <EuiSpacer size="m" />
      </>
    );
  }
);

EndpointExceptionsMovedCallout.displayName = 'EndpointExceptionsMovedCallout';
