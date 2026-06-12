/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import { getLinksFromSignature } from './suricata_links';

export const SuricataRefs = React.memo<{ signatureId: number }>(({ signatureId }) => {
  const [linksFromSignature, setLinksFromSignature] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    let isSubscribed = true;
    async function getLinks() {
      if (signatureId != null) {
        try {
          const links = await getLinksFromSignature(signatureId);
          if (isSubscribed && links != null) {
            setLinksFromSignature(links);
          }
        } catch (exc) {
          setLinksFromSignature(undefined);
        }
      } else if (isSubscribed) {
        setLinksFromSignature(undefined);
      }
    }
    getLinks();
    return () => {
      isSubscribed = false;
    };
  }, [signatureId]);

  return (
    <EuiFlexGroup data-test-subj="suricataRefs" gutterSize="none" justifyContent="center" wrap>
      {linksFromSignature &&
        linksFromSignature.map((link) => (
          <EuiFlexItem key={link} grow={false} css={{ display: 'inline' }}>
            <EuiLink href={link} color="subdued" target="_blank">
              {link}
            </EuiLink>
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
});

SuricataRefs.displayName = 'SuricataRefs';
