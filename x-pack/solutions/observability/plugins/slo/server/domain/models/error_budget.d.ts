import type * as t from 'io-ts';
import type { errorBudgetSchema } from '@kbn/slo-schema';
type ErrorBudget = t.TypeOf<typeof errorBudgetSchema>;
export type { ErrorBudget };
