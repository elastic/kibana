/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { NightshiftInvestigationAttachment } from '../../common/investigation_attachment';
import { NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE } from '../../common/investigation_attachment';
import { investigationAttachmentDefinition } from './investigation_attachment';

const attachment: NightshiftInvestigationAttachment = {
  id: 'nightshift-investigation',
  type: NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE,
  data: {
    investigation_id: 'exec-1',
    state: {
      summary: 'Checkout latency tripled after the 14:02 deploy.',
      severity: '80-critical',
      hypotheses: [
        { candidate: 'Connection pool exhaustion', confidence: 0.9, status: 'confirmed' },
      ],
    },
  },
};

const renderCanvas = (target: NightshiftInvestigationAttachment = attachment) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <>
          {investigationAttachmentDefinition.renderCanvasContent?.(
            { attachment: target, isSidebar: false },
            {
              registerActionButtons: jest.fn(),
              updateOrigin: jest.fn(),
              closeCanvas: jest.fn(),
            }
          )}
        </>
      </I18nProvider>
    </EuiProvider>
  );

describe('investigationAttachmentDefinition', () => {
  it('renders the findings on the canvas', () => {
    renderCanvas();

    expect(screen.getByTestId('investigationOutput')).toBeInTheDocument();
    expect(
      screen.getByText('Checkout latency tripled after the 14:02 deploy.')
    ).toBeInTheDocument();
    expect(screen.getByText('Connection pool exhaustion')).toBeInTheDocument();
  });

  it('renders a run that recorded no hypotheses without claiming it is still working', () => {
    renderCanvas({
      ...attachment,
      data: {
        investigation_id: 'exec-1',
        state: { summary: 'Nothing conclusive.', hypotheses: [] },
      },
    });

    expect(
      screen.getByText('No hypotheses were recorded for this investigation.')
    ).toBeInTheDocument();
  });

  it('surfaces the severity as a header badge', () => {
    const header = investigationAttachmentDefinition.getHeader?.({ attachment });

    expect(header?.badges).toHaveLength(1);
  });

  it('carries no badge for an investigation that never rated its severity', () => {
    const header = investigationAttachmentDefinition.getHeader?.({
      attachment: {
        ...attachment,
        data: { investigation_id: 'exec-1', state: { summary: 'ok', hypotheses: [] } },
      },
    });

    expect(header?.badges).toEqual([]);
  });

  describe('getActionButtons', () => {
    const baseParams = { attachment, isSidebar: false, updateOrigin: jest.fn() };

    it('offers a button that opens the canvas', () => {
      const openCanvas = jest.fn();
      const buttons =
        investigationAttachmentDefinition.getActionButtons?.({
          ...baseParams,
          isCanvas: false,
          openCanvas,
        }) ?? [];

      expect(buttons).toHaveLength(1);
      expect(buttons[0].type).toBe(ActionButtonType.SECONDARY);

      buttons[0].handler();
      expect(openCanvas).toHaveBeenCalledTimes(1);
    });

    it('offers no button once the canvas is already open', () => {
      const buttons =
        investigationAttachmentDefinition.getActionButtons?.({
          ...baseParams,
          isCanvas: true,
          openCanvas: jest.fn(),
        }) ?? [];

      expect(buttons).toHaveLength(0);
    });
  });
});
