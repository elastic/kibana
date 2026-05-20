import type { SLODefinition } from '../models';
/**
 * Asserts the SLO Definition is valid from a business invariants point of view.
 * e.g. a 'target' objective requires a number between ]0, 1]
 * e.g. a 'timeslices' budgeting method requires an objective's timeslice_target to be defined.
 *
 * @param slo {SLODefinition}
 */
export declare function validateSLO(slo: SLODefinition): void;
