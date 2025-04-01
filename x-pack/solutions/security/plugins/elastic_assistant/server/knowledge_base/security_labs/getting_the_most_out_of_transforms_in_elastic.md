---
title: "Getting the Most Out of Transformers in Elastic"
slug: "getting-the-most-out-of-transforms-in-elastic"
date: "2022-08-23"
description: "In this blog, we will briefly talk about how we fine-tuned a transformer model meant for a masked language modeling (MLM) task, to make it suitable for a classification task."
author:
  - slug: apoorva-joshi
  - slug: thomas-veasey
  - slug: benjamin-trent
image: "machine-learning-1200x628px-2021-notext.jpg"
category:
  - slug: security-research
tags:
  - machine learning
---

## Preamble

In 8.3, our Elastic Stack Machine Learning team introduced a way to import [third party Natural Language Processing (NLP) models](https://www.elastic.co/guide/en/machine-learning/master/ml-nlp-model-ref.html) into Elastic. As security researchers, we HAD to try it out on a security dataset. So we decided to build a model to identify malicious command lines by fine-tuning a pre-existing model available on the [Hugging Face model hub](https://huggingface.co/models).

Upon finding that the fine-tuned model was performing (surprisingly!) well, we wanted to see if it could replace or be combined with our previous [tree-based model](https://www.elastic.co/blog/problemchild-detecting-living-off-the-land-attacks) for detecting Living off the Land (LotL) attacks. But first, we had to make sure that the throughput and latency of this new model were reasonable enough for real-time inference. This resulted in a series of experiments, the results of which we will detail in this blog.

In this blog, we will briefly talk about how we fine-tuned a transformer model meant for a masked language modeling (MLM) task, to make it suitable for a classification task. We will also look at how to import custom models into Elastic. Finally, we’ll dive into all the experiments we did around using the fine-tuned model for real-time inference.

## NLP for command line classification

Before you start building NLP models, it is important to understand whether an [NLP](https://www.ibm.com/cloud/learn/natural-language-processing) model is even suitable for the task at hand. In our case, we wanted to classify command lines as being malicious or benign. Command lines are a set of commands provided by a user via the computer terminal. An example command line is as follows:

```
**move test.txt C:\**
```

The above command moves the file **test.txt** to the root of the \*\*C:\*\* directory.

Arguments in command lines are related in the way that the co-occurrence of certain values can be indicative of malicious activity. NLP models are worth exploring here since these models are designed to understand and interpret relationships in natural (human) language, and since command lines often use some natural language.

## Fine-tuning a Hugging Face model

Hugging Face is a data science platform that provides tools for machine learning (ML) enthusiasts to build, train, and deploy ML models using open source code and technologies. Its model hub has a wealth of models, trained for a variety of NLP tasks. You can either use these pre-trained models as-is to make predictions on your data, or fine-tune the models on datasets specific to your [NLP](https://www.ibm.com/cloud/learn/natural-language-processing) tasks.

The first step in fine-tuning is to instantiate a model with the model configuration and pre-trained weights of a specific model. Random weights are assigned to any task-specific layers that might not be present in the base model. Once initialized, the model can be trained to learn the weights of the task-specific layers, thus fine-tuning it for your task. Hugging Face has a method called [from_pretrained](https://huggingface.co/docs/transformers/v4.21.1/en/main_classes/model#transformers.PreTrainedModel.from_pretrained) that allows you to instantiate a model from a pre-trained model configuration.

For our command line classification model, we created a [RoBERTa](https://huggingface.co/docs/transformers/model_doc/roberta) model instance with encoder weights copied from the [roberta-base](https://huggingface.co/roberta-base) model, and a randomly initialized sequence classification head on top of the encoder:

**model = RobertaForSequenceClassification.from_pretrained('roberta-base', num_labels=2)**

Hugging Face comes equipped with a [Tokenizers](https://huggingface.co/docs/transformers/v4.21.0/en/main_classes/tokenizer) library consisting of some of today's most used tokenizers. For our model, we used the [RobertaTokenizer](https://huggingface.co/docs/transformers/model_doc/roberta#transformers.RobertaTokenizer) which uses [Byte Pair Encoding](https://en.wikipedia.org/wiki/Byte_pair_encoding) (BPE) to create tokens. This tokenization scheme is well-suited for data belonging to a different domain (command lines) from that of the tokenization corpus (English text). A code snippet of how we tokenized our dataset using **RobertaTokenizer** can be found [here](https://gist.github.com/ajosh0504/4560af91adb48212402300677cb65d4a#file-tokenize-py). We then used Hugging Face's [Trainer](https://huggingface.co/docs/transformers/v4.21.0/en/main_classes/trainer#transformers.Trainer) API to train the model, a code snippet of which can be found [here](https://gist.github.com/ajosh0504/4560af91adb48212402300677cb65d4a#file-train-py).

ML models do not understand raw text. Before using text data as inputs to a model, it needs to be converted into numbers. Tokenizers group large pieces of text into smaller semantically useful units, such as (but not limited to) words, characters, or subwords — called token —, which can, in turn, be converted into numbers using different encoding techniques.

> - Check out [this](https://youtu.be/_BZearw7f0w) video (2:57 onwards) to review additional pre-processing steps that might be needed after tokenization based on your dataset.
> - A complete tutorial on how to fine-tune pre-trained Hugging Face models can be found [here](https://huggingface.co/docs/transformers/training).

## Importing custom models into Elastic

Once you have a trained model that you are happy with, it's time to import it into Elastic. This is done using [Eland](https://www.elastic.co/guide/en/elasticsearch/client/eland/current/machine-learning.html), a Python client and toolkit for machine learning in Elasticsearch. A code snippet of how we imported our model into Elastic using Eland can be found [here](https://gist.github.com/ajosh0504/4560af91adb48212402300677cb65d4a#file-import-py).  
You can verify that the model has been imported successfully by navigating to **Model Management \\> Trained Models** via the Machine Learning UI in Kibana:

![Imported model in the Trained Models UI](/assets/images/getting-the-most-out-of-transforms-in-elastic/Imported_model_in_the_Trained_Models_UI.png)

## Using the Transformer model for inference — a series of experiments

We ran a series of experiments to evaluate whether or not our Transformer model could be used for real-time inference. For the experiments, we used a dataset consisting of ~66k command lines.

Our first inference run with our fine-tuned **RoBERTa** model took ~4 hours on the test dataset. At the outset, this is much slower than the tree-based model that we were trying to beat at ~3 minutes for the entire dataset. It was clear that we needed to improve the throughput and latency of the PyTorch model to make it suitable for real-time inference, so we performed several experiments:

### Using multiple nodes and threads

The latency numbers above were observed when the models were running on a single thread on a single node. If you have multiple Machine Learning (ML) nodes associated with your Elastic deployment, you can run inference on multiple nodes, and also on multiple threads on each node. This can significantly improve the throughput and latency of your models.

You can change these parameters while starting the trained model deployment via the [API](https://www.elastic.co/guide/en/elasticsearch/reference/master/start-trained-model-deployment.html):

```
**POST \_ml/trained\_models/\\<model\_id\\>/deployment/\_start?number\_of\_allocations=2&threa ds\_per\_allocation=4**
```

**number_of_allocations** allows you to set the total number of allocations of a model across machine learning nodes and can be used to tune model throughput. **threads_per_allocation** allows you to set the number of threads used by each model allocation during inference and can be used to tune model latency. Refer to the [API documentation](https://www.elastic.co/guide/en/elasticsearch/reference/master/start-trained-model-deployment.html) for best practices around setting these parameters.

In our case, we set the **number_of_allocations** to **2** , as our cluster had two ML nodes and **threads_per_allocation** to **4** , as each node had four allocated processors.

Running inference using these settings **resulted in a 2.7x speedup** on the original inference time.

### Dynamic quantization

Quantizing is one of the most effective ways of improving model compute cost, while also reducing model size. The idea here is to use a reduced precision integer representation for the weights and/or activations. While there are a number of ways to trade off model accuracy for increased throughput during model development, [dynamic quantization](https://pytorch.org/tutorials/intermediate/dynamic_quantization_bert_tutorial.html) helps achieve a similar trade-off after the fact, thus saving on time and resources spent on iterating over the model training.

Eland provides a way to dynamically quantize your model before importing it into Elastic. To do this, simply pass in quantize=True as an argument while creating the TransformerModel object (refer to the code snippet for importing models) as follows:

```
**# Load the custom model**
**tm = TransformerModel("model", "text\_classification", quantize=True)**
```

In the case of our command line classification model, we observed the model size drop from 499 MB to 242 MB upon dynamic quantization. Running inference on our test dataset using this model **resulted in a 1.6x speedup** on the original inference time, for a slight drop in model [**sensitivity**](https://en.wikipedia.org/wiki/Sensitivity_and_specificity) (exact numbers in the following section) **.**

### Knowledge Distillation

[Knowledge Distillation](https://towardsdatascience.com/knowledge-distillation-simplified-dd4973dbc764) is a way to achieve model compression by transferring knowledge from a large (teacher) model to a smaller (student) one while maintaining validity. At a high level, this is done by using the outputs from the teacher model at every layer, to backpropagate error through the student model. This way, the student model learns to replicate the behavior of the teacher model. Model compression is achieved by reducing the number of parameters, which is directly related to the latency of the model.

To study the effect of knowledge distillation on the performance of our model, we fine-tuned a [distilroberta-base](https://huggingface.co/distilroberta-base) model (following the same procedure described in the fine-tuning section) for our command line classification task and imported it into Elastic. **distilroberta-base** has 82 million parameters, compared to its teacher model, **roberta-base** , which has 125 million parameters. The model size of the fine-tuned **DistilRoBERTa** model turned out to be **329** MB, down from **499** MB for the **RoBERTa** model.

Upon running inference with this model, we **observed a 1.5x speedup** on the original inference time and slightly better model sensitivity (exact numbers in the following section) than the fine-tuned roberta-base model.

### Dynamic quantization and knowledge distillation

We observed that dynamic quantization and model distillation both resulted in significant speedups on the original inference time. So, our final experiment involved running inference with a quantized version of the fine-tuned **DistilRoBERTa** model.

We found that this **resulted in a 2.6x speedup** on the original inference time, and slightly better model sensitivity (exact numbers in the following section). We also observed the model size drop from **329** MB to **199** MB after quantization.

## Bringing it all together

Based on our experiments, dynamic quantization and model distillation resulted in significant inference speedups. Combining these improvements with distributed and parallel computing, we were further able to **reduce the total inference time on our test set from four hours to 35 minutes**. However, even our fastest transformer model was still several magnitudes slower than the tree-based model, despite using significantly more CPU resources.

The Machine Learning team here at Elastic is introducing an inference caching mechanism in version 8.4 of the Elastic Stack, to save time spent on performing inference on repeat samples. These are a common occurrence in real-world environments, especially when it comes to Security. With this optimization in place, we are optimistic that we will be able to use transformer models alongside tree-based models in the future.

A comparison of the sensitivity (true positive rate) and specificity (true negative rate) of our tree-based and transformer models shows that an ensemble of the two could potentially result in a more performant model:

|                         |                 |                         |                 |                         |
| ----------------------- | --------------- | ----------------------- | --------------- | ----------------------- |
| Model                   | Sensitivity (%) | False Negative Rate (%) | Specificity (%) | False Positive Rate (%) |
| Tree-based              | 99.53           | 0.47                    | 99.99           | 0.01                    |
| RoBERTa                 | 99.57           | 0.43                    | 97.76           | 2.24                    |
| RoBERTa quantized       | 99.56           | 0.44                    | 97.64           | 2.36                    |
| DistilRoBERTa           | 99.68           | 0.32                    | 98.66           | 1.34                    |
| DistilRoBERTa quantized | 99.69           | 0.31                    | 98.71           | 1.29                    |

As seen above, the tree-based model is better suited for classifying benign data while the transformer model does better on malicious samples, so a weighted average or voting ensemble could work well to reduce the total error by averaging the predictions from both the models.

## What's next

We plan to cover our findings from inference caching and model ensembling in a follow-up blog. Stay tuned!

In the meanwhile, we’d love to hear about models you're building for inference in Elastic. If you'd like to share what you're doing or run into any issues during the process, please reach out to us on our [community Slack channel](https://ela.st/slack)and [discussion forums](https://discuss.elastic.co/c/security). Happy experimenting!
