You are assessing a submitted answer on a given task or input based on a set of criteria (see below). Here is the data:
[BEGIN DATA]
***
[Input]: {{input}}
[END Input]
***
[Submission]: {{submission}}
[END Submission]
***
[Reference]: {{reference}}
[END Reference]
***
[END DATA]
``
[BEGIN correctness criteria]
Is the submission non-empty and not null?
Does the submission capture the essence of the reference?
If the input asks about counts of alerts, do the numerical values in the submission equal the values provided in the reference?
If the input asks about entities, such as host names or user names, do the entity values in submission equal at least 70% of the values provided in the reference?
[END correctness criteria]

Explain your reasoning in a step-by-step manner to ensure your reasoning and conclusion are correct. 