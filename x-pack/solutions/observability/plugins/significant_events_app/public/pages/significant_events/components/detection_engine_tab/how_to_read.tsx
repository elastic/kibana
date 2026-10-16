/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

const DISMISSED_KEY = 'significantEventsApp.detectionEngine.howToReadDismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch (error) {
    // Storage can be blocked by browser settings; the guide then simply shows again.
    return false;
  }
}

/** A short guide for someone opening the page for the first time; hidden once dismissed. */
export function HowToRead() {
  const [isDismissed, setIsDismissed] = useState(readDismissed);
  if (isDismissed) {
    return null;
  }

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    } catch (error) {
      // Not remembered across reloads, which is fine for a hint.
    }
    setIsDismissed(true);
  };

  return (
    <>
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        color="primary"
        data-test-subj="detectionEngineHowToRead"
        title={i18n.translate('xpack.significantEventsApp.detectionEngine.howTo.title', {
          defaultMessage: 'How to read this page',
        })}
      >
        <EuiText size="xs">
          <ol>
            <li>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.howTo.watch', {
                defaultMessage:
                  'Every minute, strategies measure each service in the enabled sources: KI queries, health checks, new log patterns, and your own alerts. Each measured series is a signal.',
              })}
            </li>
            <li>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.howTo.decide', {
                defaultMessage:
                  'Code compares each signal with its own normal and groups signals that look like the same problem. One AI step then reads the evidence, confirms or rejects, and writes the explanation.',
              })}
            </li>
            <li>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.howTo.events', {
                defaultMessage:
                  'A significant event is active while a signal is above normal, recovering once all are back to normal, and closed after a few quiet minutes. Open one to see how it was detected, its evidence rows, and how fast it was raised.',
              })}
            </li>
          </ol>
        </EuiText>
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={dismiss}
          data-test-subj="detectionEngineHowToReadDismiss"
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.howTo.dismiss', {
            defaultMessage: 'Got it, hide this',
          })}
        </EuiButtonEmpty>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
}
