/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Project browser monitors fixture. Ported from the FTR fixture
 * `apis/synthetics/fixtures/project_browser_monitor.json` (read there via
 * `getFixtureJson`). Kept as a typed module so Scout specs can import it
 * directly without filesystem reads.
 */
export const projectBrowserMonitorFixture = {
  keep_stale: true,
  project: 'test-suite',
  monitors: [
    {
      throttling: {
        download: 5,
        upload: 3,
        latency: 20,
      },
      schedule: 10,
      locations: ['dev'],
      params: {},
      playwrightOptions: {
        headless: true,
        chromiumSandbox: false,
      },
      name: 'check if title is present',
      id: 'check-if-title-is-present',
      tags: [],
      content:
        'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
      filter: {
        match: 'check if title is present',
      },
      hash: 'ekrjelkjrelkjre',
      max_attempts: 2,
      type: 'browser',
    },
  ],
} as const;
