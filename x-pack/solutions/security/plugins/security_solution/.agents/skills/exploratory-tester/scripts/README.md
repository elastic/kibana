# exploratory-tester scripts

Helpers invoked by the phase documents in `../phases/`. `session_resources.py`
is the shared library; everything else is a CLI entry point or a document
containing a runnable template.

## Running the tests

```bash
cd x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts
python3 test_session_resources.py
```

Requires only the standard library. Add `-k <pattern>` via `unittest` to narrow
a run. Pass `-B` there: importing the suite as a module caches its bytecode
before any code in it runs, and this directory is inside a git checkout with no
`__pycache__` ignore rule.

```bash
python3 -B -m unittest test_session_resources -k reservation
```

The suite is not part of Kibana CI: it is Python, and Kibana's pipelines have no
Python test step (the sibling suite at `.agents/scripts/test_session_metrics.py`
is in the same position). Run it locally before sending a change that touches
anything in this directory or in `../phases/`.

## What the tests cover

Beyond the library's own behaviour, the suite asserts properties of the phase
and template documents, because the agent executes those code blocks verbatim:

- Markdown fences are balanced and never nested, so no block is silently
  swallowed into a neighbouring one.
- No document uses `curl -X HEAD`, which stalls for the whole timeout against
  keep-alive servers; use `-I` instead.
- Every setup mutation is registered for cleanup, and resources are reserved
  before the request that creates them.
- Ownership is never downgraded silently: discarding a reservation this session
  made requires `--confirm-preexisting`, so a resource cannot vanish from both
  the pending list and the cleanup list.
