/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeRightPanelLayout } from './explorer_tab';

const GAP = '8px';

describe('computeRightPanelLayout', () => {
  it('reserves nothing when neither panel is open', () => {
    const layout = computeRightPanelLayout({
      showTimeline: false,
      isTimelineExpanded: false,
      showDossier: false,
      gap: GAP,
    });
    expect(layout.reservedRight).toBe('0');
    expect(layout.dossierRight).toBe(GAP);
  });

  it('reserves only the timeline width when just the timeline is open', () => {
    const layout = computeRightPanelLayout({
      showTimeline: true,
      isTimelineExpanded: false,
      showDossier: false,
      gap: GAP,
    });
    expect(layout.reservedRight).toBe(layout.timelineWidth);
  });

  it('reserves only the dossier width when just the dossier is open', () => {
    const layout = computeRightPanelLayout({
      showTimeline: false,
      isTimelineExpanded: false,
      showDossier: true,
      gap: GAP,
    });
    expect(layout.reservedRight).toBe(layout.dossierWidth);
    // Dossier stays on the far right when the timeline is closed.
    expect(layout.dossierRight).toBe(GAP);
  });

  it('docks the dossier LEFT of the timeline when both are open (no overlap)', () => {
    const layout = computeRightPanelLayout({
      showTimeline: true,
      isTimelineExpanded: false,
      showDossier: true,
      gap: GAP,
    });
    // Dossier is offset by the timeline width + gap, so it never sits under it.
    expect(layout.dossierRight).toBe(`calc(${layout.timelineWidth} + ${GAP})`);
    // The graph reserves both widths combined.
    expect(layout.reservedRight).toBe(`calc(${layout.timelineWidth} + ${layout.dossierWidth})`);
  });

  it('caps the expanded timeline narrower when the dossier is also docked', () => {
    const soloExpanded = computeRightPanelLayout({
      showTimeline: true,
      isTimelineExpanded: true,
      showDossier: false,
      gap: GAP,
    });
    const withDossier = computeRightPanelLayout({
      showTimeline: true,
      isTimelineExpanded: true,
      showDossier: true,
      gap: GAP,
    });
    expect(soloExpanded.timelineWidth).toBe('min(760px, 62%)');
    expect(withDossier.timelineWidth).toBe('min(520px, 46%)');
  });
});
