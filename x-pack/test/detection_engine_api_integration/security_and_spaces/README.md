# What are all these groups?

These tests take a while so they have been broken up into groups with their own `config.ts` and `index.ts` file, causing each of these groups to be independent bundles of tests which can be run on some worker in CI without taking an incredible amount of time.

Want to change the groups to something more logical? Have fun! Just make sure that each group executes on CI in less than 10 minutes or so. We don't currently have any mechanism for validating this right now, you just need to look at the times in the log output on CI, but we'll be working on tooling for making this information more accessible soon.

- Kibana Operations

# Rule Exception List Tests

These tests are currently in group7-9.

These are tests for rule exception lists where we test each data type

- date
- double
- float
- integer
- ip
- keyword
- long
- text

Against the operator types of:

- "is"
- "is not"
- "is one of"
- "is not one of"
- "exists"
- "does not exist"
- "is in list"
- "is not in list"
