---
layout: post
title: "Омотач за MotEvo"
author: "Ђорђе Релић"
tags: [python, биоинформатика, алати]
ref: motevowrapper
ai_translated: Claude Opus 5.5
---

За један од својих пројеката користио сам MotEvo. [MotEvo](https://pubmed.ncbi.nlm.nih.gov/22334039/) (Arnold et al. 2012)[^1] је бајесовски пробабилистички модел за предвиђање места везивања транскрипционих фактора (TFBS) за задати скуп позиционих тежинских матрица (PWM) и ДНК секвенци. Развијен је у лабораторији van Nimwegen-а на Biozentrum-у (Универзитет у Базелу, Швајцарска), а може се преузети [овде](https://swissregulon.unibas.ch/sr/software).

Недавно сам написао једноставан омотач за MotEvo који омогућава да се покреће из Python-а. Успут сам га и објавио на PyPi серверу, тако да се може инсталирати једноставним покретањем:

```bash
pip install motevowrapper
```

Више детаља (ускоро, надам се, и са комплетном документацијом) можете наћи на [страници репозиторијума](https://github.com/brlauuu/motevowrapper).

За сва питања или коментаре слободно [пријавите проблем](https://github.com/brlauuu/motevowrapper/issues/) или ми пошаљите мејл.

## Референце

[^1]: Arnold, Phil, et al. "MotEvo: integrated Bayesian probabilistic methods for inferring regulatory sites and motifs on multiple alignments of DNA sequences." Bioinformatics 28.4 (2012): 487-494.
