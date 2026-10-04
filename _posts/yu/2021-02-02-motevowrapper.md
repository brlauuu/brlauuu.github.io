---
layout: post
title: "Omotač za MotEvo"
author: "Đorđe Relić"
tags: [python, bioinformatika, alati]
ref: motevowrapper
ai_translated: Claude Opus 5.5
---

Za jedan od svojih projekata koristio sam MotEvo. [MotEvo](https://pubmed.ncbi.nlm.nih.gov/22334039/) (Arnold et al. 2012)[^1] je bajesovski probabilistički model za predviđanje mesta vezivanja transkripcionih faktora (TFBS) za zadati skup pozicionih težinskih matrica (PWM) i DNK sekvenci. Razvijen je u laboratoriji van Nimwegen-a na Biozentrum-u (Univerzitet u Bazelu, Švajcarska), a može se preuzeti [ovde](https://swissregulon.unibas.ch/sr/software).

Nedavno sam napisao jednostavan omotač za MotEvo koji omogućava da se pokreće iz Python-a. Usput sam ga i objavio na PyPi serveru, tako da se može instalirati jednostavnim pokretanjem:

```bash
pip install motevowrapper
```

Više detalja (uskoro, nadam se, i sa kompletnom dokumentacijom) možete naći na [stranici repozitorijuma](https://github.com/brlauuu/motevowrapper).

Za sva pitanja ili komentare slobodno [prijavite problem](https://github.com/brlauuu/motevowrapper/issues/) ili mi pošaljite mejl.

## Reference

[^1]: Arnold, Phil, et al. "MotEvo: integrated Bayesian probabilistic methods for inferring regulatory sites and motifs on multiple alignments of DNA sequences." Bioinformatics 28.4 (2012): 487-494.
