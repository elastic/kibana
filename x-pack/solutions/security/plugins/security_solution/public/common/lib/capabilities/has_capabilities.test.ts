/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasCapabilities, existCapabilities } from './has_capabilities';

const EMPTY_CAPABILITIES = { navLinks: {}, management: {}, catalogue: {} };

describe('hasCapabilities', () => {
  it('returns true when no capabilities are required', () => {
    expect(hasCapabilities(EMPTY_CAPABILITIES)).toEqual(true);
  });

  describe('when requiredCapabilities is a string', () => {
    const requiredCapabilities = 'requiredCapability.show';

    it('returns false when the capability is missing', () => {
      expect(hasCapabilities(EMPTY_CAPABILITIES, requiredCapabilities)).toEqual(false);
    });

    it('returns false when the capability is false', () => {
      const capabilities = {
        ...EMPTY_CAPABILITIES,
        requiredCapability: { show: false },
      };
      expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
    });

    it('returns true when the capability is true', () => {
      const capabilities = {
        ...EMPTY_CAPABILITIES,
        requiredCapability: { show: true },
      };
      expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
    });
  });

  describe('when requiredCapabilities is an array', () => {
    describe('when there is only one array (OR)', () => {
      const requiredCapabilities = ['requiredCapability.show', 'requiredCapability2.show'];

      it('returns true when no capabilities are required', () => {
        expect(hasCapabilities(EMPTY_CAPABILITIES, [])).toEqual(true);
      });

      it('returns false when all of the capabilities are missing', () => {
        const capabilities = EMPTY_CAPABILITIES;
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns true when any of the capabilities are true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns false when all of the capabilities are false or missing', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });
    });

    describe('when there subArrays (AND)', () => {
      const requiredCapabilities = [['requiredCapability.show', 'requiredCapability2.show']];

      it('returns true when no capabilities are required', () => {
        expect(hasCapabilities(EMPTY_CAPABILITIES, [[]])).toEqual(true);
      });

      it('returns false when one of the capabilities is not present', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
        };

        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns false when one of the capabilities is false', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
          requiredCapability2: { show: false },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns true when both capabilities are true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
          requiredCapability2: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });
    });

    describe('when there are mixed strings and subArrays (AND and OR)', () => {
      const requiredCapabilities = [
        'requiredCapability.show',
        ['requiredCapability2.show', 'requiredCapability3.show'],
      ];

      it('returns true when one of the OR capabilities is true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
        };

        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns true when the AND capabilities are true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
          requiredCapability2: { show: true },
          requiredCapability3: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns false when only one of the AND capabilities is true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability2: { show: true },
          requiredCapability3: { show: false },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });
    });

    describe('when there are inner OR groups (AND with inner OR)', () => {
      // [[f1, { or: [f2, f3] }]] => f1 && (f2 || f3)
      const requiredCapabilities = [
        [
          'requiredCapability.show',
          { or: ['requiredCapability2.show', 'requiredCapability3.show'] },
        ],
      ];

      it('returns true when the AND capability and one of the inner OR capabilities are true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
          requiredCapability2: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns true when the AND capability and the other inner OR capability are true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
          requiredCapability3: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns false when only the AND capability is true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns false when only the inner OR capabilities are true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability2: { show: true },
          requiredCapability3: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns false when no capabilities are true', () => {
        expect(hasCapabilities(EMPTY_CAPABILITIES, requiredCapabilities)).toEqual(false);
      });
    });

    describe('when there are mixed outer OR and inner OR groups', () => {
      // [f4, [f1, { or: [f2, f3] }]] => f4 || (f1 && (f2 || f3))
      const requiredCapabilities = [
        'requiredCapability4.show',
        [
          'requiredCapability.show',
          { or: ['requiredCapability2.show', 'requiredCapability3.show'] },
        ],
      ];

      it('returns true when the outer OR capability is true', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability4: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns true when the AND with inner OR group is satisfied', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
          requiredCapability2: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns false when neither outer OR nor inner group is satisfied', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
        };
        expect(hasCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });
    });
  });
});

describe('existCapabilities', () => {
  it('returns true when no capabilities are required', () => {
    expect(existCapabilities(EMPTY_CAPABILITIES)).toEqual(true);
  });

  describe('when requiredCapabilities is a string', () => {
    const requiredCapabilities = 'requiredCapability.show';

    it('returns false when the capability is missing', () => {
      expect(existCapabilities(EMPTY_CAPABILITIES, requiredCapabilities)).toEqual(false);
    });

    it('returns true when the capability is false', () => {
      const capabilities = {
        ...EMPTY_CAPABILITIES,
        requiredCapability: { show: false },
      };
      expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
    });

    it('returns true when the capability is true', () => {
      const capabilities = {
        ...EMPTY_CAPABILITIES,
        requiredCapability: { show: true },
      };
      expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
    });
  });

  describe('when requiredCapabilities is an array', () => {
    describe('when there is only one array (OR)', () => {
      const requiredCapabilities = ['requiredCapability.show', 'requiredCapability2.show'];

      it('returns true when no capabilities are required', () => {
        expect(existCapabilities(EMPTY_CAPABILITIES, [])).toEqual(true);
      });

      it('returns false when all of the capabilities are missing', () => {
        const capabilities = EMPTY_CAPABILITIES;
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns true when any of the capabilities exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });
    });

    describe('when there subArrays (AND)', () => {
      const requiredCapabilities = [['requiredCapability.show', 'requiredCapability2.show']];

      it('returns true when no capabilities are required', () => {
        expect(existCapabilities(EMPTY_CAPABILITIES, [[]])).toEqual(true);
      });

      it('returns false when one of the capabilities is not present', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
        };

        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns true when both capabilities exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
          requiredCapability2: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });
    });

    describe('when there are mixed strings and subArrays (AND and OR)', () => {
      const requiredCapabilities = [
        'requiredCapability.show',
        ['requiredCapability2.show', 'requiredCapability3.show'],
      ];

      it('returns true when one of the OR capabilities exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: true },
        };

        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns true when the AND capabilities exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability2: { show: false },
          requiredCapability3: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns false when only one of the AND capabilities exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability3: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });
    });

    describe('when there are inner OR groups (AND with inner OR)', () => {
      // [[f1, { or: [f2, f3] }]] => f1 && (f2 || f3)
      const requiredCapabilities = [
        [
          'requiredCapability.show',
          { or: ['requiredCapability2.show', 'requiredCapability3.show'] },
        ],
      ];

      it('returns true when the AND capability and one inner OR capability exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
          requiredCapability2: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns true when the AND capability and the other inner OR capability exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
          requiredCapability3: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(true);
      });

      it('returns false when only the AND capability exists', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });

      it('returns false when only the inner OR capabilities exist', () => {
        const capabilities = {
          ...EMPTY_CAPABILITIES,
          requiredCapability2: { show: false },
          requiredCapability3: { show: false },
        };
        expect(existCapabilities(capabilities, requiredCapabilities)).toEqual(false);
      });
    });
  });
});
