Within this folder is input test data for tests such as:

```ts
security_and_spaces/tests/rule_exceptions.ts
```

where these are small ECS compliant input indexes that try to express tests that exercise different parts of
the detection engine around creating and validating that the exceptions part of the detection engine functions.
Compliant meaning that these might contain extra fields but should not clash with ECS. Nothing stopping anyone
from being ECS strict and not having additional extra fields but the extra fields and mappings are to just try
and keep these tests simple and small.

 Examples are:

This is a ECS document which contains a simple list of dates which we should be able to add exceptions to.
This is good for testing and validating dates, date ranges, etc...
```
date
```

This is a ECS document which contains a simple list of doubles which we should be able to add exceptions to.
This is good for testing and validating doubles, float ranges, etc...
```
double
```

This is a ECS document which contains a simple list of floats which we should be able to add exceptions to.
This is good for testing and validating floats, float ranges, etc...
```
float
```

This is a ECS document which contains a simple list of doubles which we should be able to add exceptions to.
This is good for testing and validating integer, integer ranges, etc...
```
integer
```

This is a input ECS document that has a small list of IPs which we should be able to add exceptions to.
This is good for testing IP Ranges, regular IP 1 to 1 matches, etc... 
```
ip
```

This is a ECS document which contains a simple list of longs which we should be able to add exceptions to.
This is good for testing and validating long, long ranges, etc...
```
long
```

This is a ECS document which contains a simple list of text names which we should be able to add exceptions to.
This is good for testing and validating text, text exceptions, keyword lists, etc...
```
text
```

This is a ECS document which contains a simple list of keyword names which we should be able to add exceptions to.
This is good for testing and validating keywords, keyword exceptions, keyword lists, etc...
```
keyword
```
