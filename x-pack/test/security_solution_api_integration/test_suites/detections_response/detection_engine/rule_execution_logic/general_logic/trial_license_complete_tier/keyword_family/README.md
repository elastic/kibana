These are tests for the [keyword](https://www.elastic.co/guide/en/elasticsearch/reference/7.12/keyword.html) family where we test 
* keyword
* const keyword 
* alias fields against each one

Against mock rules which contain the ECS values of:
* event.module
* even.dataset

This is to ensure that if you have field aliases we will still correctly have detections occur. This also ensures that if you have
`keyword` mixed with `const keyword` across multiple indexes we will still have detections occur.