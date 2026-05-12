# Parity Verification — ES|QL Generation Regression

## Evaluator inventory

| Evaluator | Kind | Active | Framework source |
|---|---|---|---|
| ES\|QL Functional Equivalence | `LLM` | ✅ Yes | `x-pack/platform/packages/shared/kbn-evals/src/evaluators/esql/index.ts` |
| ES\|QL Validity | `CODE` | ✅ Yes | `x-pack/platform/packages/shared/kbn-evals/src/evaluators/esql/validity.ts` |
| ES\|QL Execution Validity | `CODE` | ✅ Yes | `x-pack/platform/packages/shared/kbn-evals/src/evaluators/esql/execution.ts` |
| ES\|QL Result Equivalence | `CODE` | ✅ Yes | `x-pack/platform/packages/shared/kbn-evals/src/evaluators/esql/result_equivalence.ts` |

## Score semantics

| Evaluator | Score `1` meaning | Score `0` meaning |
|---|---|---|
| ES\|QL Functional Equivalence | Queries are functionally equivalent (same results, not necessarily same syntax) | Queries are not functionally equivalent |
| ES\|QL Validity | All generated queries parse without AST errors | One or more queries have parse errors |
| ES\|QL Execution Validity | Query executes successfully against the live cluster | Query fails AST validation or cluster execution |
| ES\|QL Result Equivalence | Gold and candidate row sets are identical (Jaccard = 1) | No row overlap between gold and candidate (Jaccard = 0) |

The LLM judge labels the pair `Equivalent ES|QL query` → `1` or `Non-equivalent ES|QL query` → `0`.
The three CODE-kind evaluators are deterministic — no LLM call, scores reflect AST/runtime/row-set comparisons.

## LangSmith parity

The suite was originally evaluated on LangSmith. The table below maps each LangSmith evaluator to its `@kbn/evals` equivalent.

| LangSmith evaluator | `@kbn/evals` equivalent | Parity status |
|---|---|---|
| ES\|QL Equivalence (LLM-as-judge) | `createEsqlEquivalenceEvaluator` — `ES\|QL Functional Equivalence` | ✅ Full parity |
| ES\|QL Syntax Validity (deterministic) | `createEsqlValidityEvaluator` — `ES\|QL Validity` | ✅ Full parity |
| ES\|QL Execution (live cluster) | `createEsqlExecutionEvaluator` — `ES\|QL Execution Validity` | ✅ Full parity |
| Result-row equivalence | `createEsqlResultEquivalenceEvaluator` — `ES\|QL Result Equivalence` | ✅ Full parity |

The dataset covers **31 examples** exported from LangSmith (`ES|QL Generation Regression Suite`,
id `261dcc59-fbe7-4397-a662-ff94042f666c`, cutoff 2026-05-07).
