---
layout: post
title: "Необичан случај BLAT излаза"
author: "Ђорђе Релић"
tags: [биоинформатика, поравнање-секвенци, алати, "Преведено помоћу ВИ (Claude Opus 5.5)"]
ref: Peculiar-case-of-BLAT-output
---

У овом блог посту описаћу како сам користио BLAT да решим задатак поравнања протеинских секвенци.

## BLAT

За почетак, кратак увод. Blast Like Alignment Tool (BLAT) је алат за поравнање секвенци који је написао W. James Kent, [објављен у часопису Genome Research](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/). Упутство за BLAT може се наћи на [UCSC страници](https://genome.ucsc.edu/goldenpath/help/blatSpec.html). Како стоји у апстракту рада WJ Kent-а[^1], BLAT је развијен с намером да се убрза поравнање геномских секвенци за потребе пројекта људског генома. У поређењу са [BLAST-ом](https://blast.ncbi.nlm.nih.gov/Blast.cgi)[^2], BLAT се разликује у неколико ствари:

1. "Док BLAST прави индекс query секвенце и затим линеарно пролази кроз базу података, BLAT прави индекс базе података и затим линеарно пролази кроз query секвенцу."
2. "Док BLAST покреће проширење када се један или два поготка појаве близу један другог, BLAT може да покрене проширења на било ком броју савршених или готово савршених погодака."
3. "Док BLAST враћа сваку област хомологије између две секвенце као засебно поравнање, BLAT их спаја у једно веће поравнање."

BLAT је доступан у неколико облика, а ја сам користио самосталну верзију коју сам преузео [одавде](http://hgdownload.cse.ucsc.edu/admin/exe/). Покрећем га на MacBook Pro 2017 (macOS Catalina 10.15.6), а верзија BLAT-а коју ћу користити је `v.36`.

BLAT је написан за поравнање мРНК секвенци са целим геномом. Међутим, може се користити и за поравнање мРНК или протеинске секвенце (query) са једном или више target ДНК или протеинских секвенци (база података). Када сачувате секвенце у фајлове `query.fa` и `database.fa`, BLAT можете да покренете следећом линијом:

`> blat database.fa query.fa output.pslx -prot -out=pslx`

Параметри су: `-prot` служи за покретање BLAT-а на протеинима (и query и target), `-out=psxl` је излаз BLAT-а који садржи секвенце (фрагменте), а ја додајем и `-minScore=0` да бих уклонио подразумевани праг минималног скора који BLAT намеће, тако да командна линија коју ћу користити у остатку овог блог поста изгледа овако:

`> blat database.fa query.fa output.pslx -prot -out=pslx -minScore=0`

## Поравнање протеина помоћу BLAT-а

Проблем на којем радим је поређење протеинских секвенци између различитих врста, с намером да информације које имам за врсту A искористим и мапирам на врсту B. Притом радим са 3 врсте: [зебрицом](https://en.wikipedia.org/wiki/Zebrafish), човеком и мишем. Информације које имам за човека и миша желео бих да мапирам на зебрицу и, притом, да изаберем између човека и миша ради _бољег мапирања_ на зебрицу.

Разлог због ког користим BLAT је то што ме посебно занима поравнање ДНК-везујућих домена (DBD) протеинских секвенци, а BLAT ми омогућава да поравнам **блокове** протеинских секвенци уз очување [синтеније](https://en.wikipedia.org/wiki/Synteny) блокова секвенци DBD-ова.

На пример, желео бих да видим да ли се ген зебрице [elk3 (ENSDARG00000018688)](http://www.ensembl.org/Danio_rerio/Gene/Summary?g=ENSDARG00000018688;r=4:7677318-7713665) боље мапира на људски [ELK3 (ENSG00000111145)](http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000111145;r=12:96194375-96269824) или мишји [Ekl3 (ENSMUSG00000008398)](http://www.ensembl.org/Mus_musculus/Gene/Summary?g=ENSMUSG00000008398;r=10:93247414-93311135). За то са [ensembl-а](https://www.ensembl.org/index.html) можемо да преузмемо главне референтне протеинске секвенце и да на њима покренемо BLAT. Када их имамо, BLAT покрећемо два пута, једном за свако поравнање протеинских секвенци.

1. За човека:

`> blat Homo_sapiens_ELK3_sequence.fa Danio_rerio_elk3_sequence.fa output_hs.pslx -prot -out=pslx -minScore=0`

2. За миша:

`> blat Mus_musculus_Elk3_sequence.fa Danio_rerio_elk3_sequence.fa output_mm.pslx -prot -out=pslx -minScore=0`

У оба случаја, приметите да је `database` протеинска секвенца човека или миша, док је `query` протеинска секвенца зебрице.

## Анализа BLAT резултата

Излазни резултат BLAT-а форматиран је на следећи начин:

```
- matches - Number of matching bases that aren't repeats.
- misMatches - Number of bases that don't match.
- repMatches - Number of matching bases that are part of repeats.
- nCount - Number of 'N' bases.
- qNumInsert - Number of inserts in query.
- qBaseInsert - Number of bases inserted into query.
- tNumInsert - Number of inserts in target.
- tBaseInsert - Number of bases inserted into target.
- strand - defined as + (forward) or - (reverse) for query strand.
    In mouse, a second '+' or '-' indecates genomic strand.
- qName - Query sequence name.
- qSize - Query sequence size.
- qStart - Alignment start position in query.
- qEnd - Alignment end position in query.
- tName - Target sequence name.
- tSize - Target sequence size.
- tStart - Alignment start position in target.
- tEnd - Alignment end position in target.
- blockCount - Number of blocks in the alignment.
- blockSizes - Comma-separated list of sizes of each block.
- qStarts - Comma-separated list of start position of each
    block in query.
- tStarts - Comma-separated list of start position of each
    block in target.
- aligned sequences
```

***NB: За парсирање BLAT фајлова у python-у користио сам функцију `SearchIO.parse(blat_output_file, "blat-psl", pslx=True)` из модула [Bio.SearchIO.BlatIO-module](https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html).

У наредна два пододељка анализираћу оба покретања засебно.

***NB: ради боље прегледности резултата у наредним пододељцима, било би добро да излаз копирате у засебан текстуални документ.

## Човек

Сирови BLAT излаз изгледа овако:
```
psLayout version 3

match	mis- 	rep. 	N's	Q gap	Q gap	T gap	T gap	strand	Q        	Q   	Q    	Q  	T        	T   	T    	T  	block	blockSizes 	qStarts	 tStarts
     	match	match	   	count	bases	count	bases	      	name     	size	start	end	name     	size	start	end	count
---------------------------------------------------------------------------------------------------------------------------------------------------------------
226	29	0	0	4	129	4	137	+	elk3-202	408	0	384	ELK3-201	407	0	392	5	99,22,12,11,111,	0,139,178,215,273,	0,133,176,236,281,	MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE,RNEYLHSGLYSSFTVSSLQNPP,EEGQTVIRFVTN,SPCSSRSPSPS,TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD,	MESAITLWQFLLQLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPEILKMDPHAVE,RNEYIHSGLYSSFTINSLQNPP,EEVRTVIRFVTN,SPFSSRSPSLS,TKSPSLPPKAKKPKGLEISAPPLVLSGTDIGSIALNSPALPSGSLTPAFFTAQTPNGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGPSTLFQFPTLLNGHMPVPIPSLD,
```

Видимо следеће детаље:

- Укупно 226 аминокиселина се поклапа.
- Укупно 5 поклопљених синтених блокова. Почињу код зебрице на `0,139,178,215,273`, а код човека на `0,133,176,236,281`, са дужинама `99,22,12,11,111`.


## Миш

```
psLayout version 3

match	mis- 	rep. 	N's	Q gap	Q gap	T gap	T gap	strand	Q        	Q   	Q    	Q  	T        	T   	T    	T  	block	blockSizes 	qStarts	 tStarts
     	match	match	   	count	bases	count	bases	      	name     	size	start	end	name     	size	start	end	count
---------------------------------------------------------------------------------------------------------------------------------------------------------------
215	31	0	0	3	138	3	148	+	elk3-202	408	0	384	Elk3-201	409	0	394	4	99,24,12,111,	0,137,178,273,	0,131,176,283,	MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE,ACRNEYLHSGLYSSFTVSSLQNPP,EEGQTVIRFVTN,TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLLTPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD,	MESAITLWQFLLHLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLSRALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPHAVE,ASRNEYLHSGLYSSFTINSLQNAP,EEVRTVIRFVTN,TKSPSLPPKGKKPKGLEISAPQLLLSGTDIGSIALNSPALPSGSLTPAFFTAQTPSGLFLASSPLLPSIHFWSSLSPVAPLSPARLQGPNTLFQFPTLLNGHMPVPLPSLD,
6	0	0	0	0	0	0	0	+	elk3-202	408	251	257	Elk3-201	409	274	280	1	6,	251,	274,	PLNLSS,	PLNLSS,
```

Видимо следеће детаље:

- <span style="color:red">**Постоје два блока поравнања!**</span>.
- Први блок са укупно 215 аминокиселина које се поклапају.
    - 4 поклопљена синтена блока. Почињу код зебрице на `0,137,178,273`, а код миша на `0,131,176,283`, са дужинама `99,24,12,111`.
- Други блок са укупно 6 аминокиселина које се поклапају.
    - 1 поклопљен (синтен) блок. Почиње код зебрице на `251`, а код миша на `274`, са дужином `6`.


## Шта се дешава са овим излазом?

Е, овде ствари постају чудне. Зашто BLAT даје **две** излазне линије? Да бисмо то разумели, вратимо се корацима алгоритма:

1) **Фаза претраге**: BLAT узима плочице од *преклапајућих* блокова дугих 5 аминокиселина из query секвенце и мапира их на базу података индексирану *непреклапајућим* 5-мерима. Фаза претраге даје листу погодака ([Одељак "Clumping Hits and Identifying Homologous Regions"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)).
2) **Фаза поравнања**: погоци сакупљени у 1) проширују се у поравнања без гепова са максималним, високим скором (HSP-ови), помоћу функције скора у којој поклапање вреди 2, а непоклапање кошта 1. (*Имајте на уму да је ово део на који не можемо да утичемо!*) Затим се прави граф HSP-ова. Ако HSP A почиње пре HSP B *и* у query секвенци и у бази података, између A и B се поставља грана. Тежина гране је скор B умањен за казну за геп засновану на растојању између A и B. Тамо где се A и B преклапају, бира се тачка "укрштања" која максимизује "спајање" два HSP-а. Затим се покреће динамички алгоритам који проналази поравнање са максималним скором. Овај алгоритам се примењује док сви HSP-ови не буду повезани ([Одељак "Protein alignment"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)).

Дакле, и даље имамо два јасна питања:

1. Зашто имамо неколико поравнања која нису "спојена"?
2. Зашто имамо преклапајућа поравнања?

Одговори:

1) Оно што изгледа као "преклапајућа поравнања" не мора нужно да се преклапа у обе секвенце. Може да се преклапа у једној, док у другој "упада" у област гепа, ИЛИ цео сегмент може да "упада" у области гепова у обе секвенце. То произлази из покушаја BLAT-а да попуни гепове тако што узима _друге_ делове секвенце и "убацује" их у те гепове. (["Stitching and Filling In"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC187518/)). То је тешко видети из .pslx излаза, али када се излаз подеси на .blast, у поравнању је јасно да је то случај.

Ако покренемо:

`> blat Mus_musculus_Elk3_sequence.fa Danio_rerio_elk3_sequence.fa output_mm.pslx -prot -out=pslx -minScore=0`

добијамо излаз налик BLAST-у. И даље је BLAT, али су погоци форматирани онако како би то урадио BLAST.

```
BLASTP 2.2.11 [blat]

Reference:  Kent, WJ. (2002) BLAT - The BLAST-like alignment tool

Query= elk3-202
         (408 letters)

Database: Mus_musculus_Elk3_sequence.fa 
           1 sequences; 409 total letters

Searching.done
                                                                 Score    E
Sequences producing significant alignments:                      (bits) Value

Elk3-201                                                              195   7e-50
Elk3-201                                                              183   2e-46
Elk3-201                                                               42   9e-04
Elk3-201                                                               18   9e+03
Elk3-201                                                               11   1e+06



>Elk3-201 
          Length = 409

 Score = 195 bits (503), Expect = 7e-50
 Identities = 94/99 (95%), Positives = 96/99 (97%), Gaps = 0/99 (0%)

Query: 1  MESAITLWQFLLQLLLDQSHKHLICWTSNDGEFKLLKSEEVAKLWGLRKNKTNMNYDKLS 60
          MESAITLWQFLL LLLDQ H+HLICWTSNDGEFKLLK+EEVAKLWGLRKNKTNMNYDKLS
Sbjct: 1  MESAITLWQFLLHLLLDQKHEHLICWTSNDGEFKLLKAEEVAKLWGLRKNKTNMNYDKLS 60

Query: 61 RALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPQAVE 99
          RALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDP AVE
Sbjct: 61 RALRYYYDKNIIKKVIGQKFVYKFVSFPDILKMDPHAVE 99


 Score = 183 bits (473), Expect = 2e-46
 Identities = 91/111 (82%), Positives = 100/111 (90%), Gaps = 0/111 (0%)

Query: 274 TSSNRLPPKARKPKGLEISAPSILLSGSDLGSIALNSPALPSGSLTPAFFTAQTPSGLLL 333
           T S  LPPK +KPKGLEISAP +LLSG+D+GSIALNSPALPSGSLTPAFFTAQTPSGL L
Sbjct: 284 TKSPSLPPKGKKPKGLEISAPQLLLSGTDIGSIALNSPALPSGSLTPAFFTAQTPSGLFL 343

Query: 334 TPSPLLSSIHFWSSLSPVAPLSPARLQGHSSLFQFPSLLNGPLPVPLPNLD 384
             SPLL SIHFWSSLSPVAPLSPARLQG ++LFQFP+LLNG +PVPLP+LD
Sbjct: 344 ASSPLLPSIHFWSSLSPVAPLSPARLQGPNTLFQFPTLLNGHMPVPLPSLD 394


 Score = 42 bits (108), Expect = 9e-04
 Identities = 20/24 (83%), Positives = 22/24 (92%), Gaps = 0/24 (0%)

Query: 138 ACRNEYLHSGLYSSFTVSSLQNPP 161
           A RNEYLHSGLYSSFT++SLQN P
Sbjct: 132 ASRNEYLHSGLYSSFTINSLQNAP 155


 Score = 18 bits (47), Expect = 9e+03
 Identities = 10/12 (83%), Positives = 11/12 (92%), Gaps = 0/12 (0%)

Query: 179 EEGQTVIRFVTN 190
           EE +TVIRFVTN
Sbjct: 177 EEVRTVIRFVTN 188


 Score = 11 bits (29), Expect = 1e+06
 Identities = 6/6 (100%), Positives = 6/6 (100%), Gaps = 0/6 (0%)

Query: 252 PLNLSS 257
           PLNLSS
Sbjct: 275 PLNLSS 280

  Database: Mus_musculus_Elk3_sequence.fa
```

Гледајући овај излаз, можемо да проверимо наше блокове из BLAT-овог pslx излаза и да видимо где се уклапају у ово поравнање. Најважније, видимо да део `PLNLSS` изгледа као да се преклапа са претходним поклапањима. Наиме, из нашег првог HSP-а видимо да сви фрагменти секвенце падају између `0` и `394` у query секвенци (зебрица) и између `0` и `394` у target секвенци (миш), а у другом HSP-у имамо од `251` до `257` у query секвенци и од `274` до `280` у target секвенци. Дакле, други HSP се преклапа у обе секвенце. Међутим, из BLAST излаза видимо да и `251-257` у query секвенци и `274-280` у target секвенци **НЕ** падају на саме секвенце, већ у гепове у обе секвенце. Поравнања у target секвенци имају геп између `178-283` (која је у BLAST излазу означена као `Subjct`), а поравнање у query секвенци има геп између `190-273`.

<span style="color:red">То пак значи следеће: блокови секвенци које добијамо **нису спојени** и **нису синтени.**</span>

## Закључак

Овај једноставан случај коришћења BLAT-а за поравнање протеин-протеин даје прилично чудан излаз. Изгледа као да BLAT не ради оно што тврди да ради, а то је: да пружи листу фрагмената (или блокова) секвенце који су синтени и спојени у један погодак поравнања. Додуше, BLAT нисам покренуо у подразумеваном режиму и додао сам параметар `-minScore=0`. Када се BLAT покрене без тог параметра, "додатни" погодак се не приказује. Међутим, због природе проблема који покушавам да решим, тај параметар ми је потребан, и штета је што он једноставно руши суштинску идеју BLAT излаза.

## Остали корисни ресурси

* [https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html](https://biopython.org/DIST/docs/api/Bio.SearchIO.BlatIO-module.html)
* [https://biopython.org/DIST/docs/api/Bio.SearchIO._model.hsp.HSP-class.html](https://biopython.org/DIST/docs/api/Bio.SearchIO._model.hsp.HSP-class.html)
* [https://biopython.org/docs/1.75/api/Bio.SearchIO.BlatIO.html#supported-formats](https://biopython.org/docs/1.75/api/Bio.SearchIO.BlatIO.html#supported-formats)
* [https://biopython.org/wiki/SeqRecord](https://biopython.org/wiki/SeqRecord)
* [http://web-old.archive.org/web/20190808121048/http://bow.web.id/blog/2012/07/initial-blat-support](http://web-old.archive.org/web/20190808121048/http://bow.web.id/blog/2012/07/initial-blat-support)

## Референце

[^1]: [Kent, W. James. "BLAT—the BLAST-like alignment tool." Genome research 12.4 (2002): 656-664.](https://genome.cshlp.org/content/12/4/656)
[^2]: [Altschul, Stephen F., et al. "Basic local alignment search tool." Journal of molecular biology 215.3 (1990): 403-410.](https://www.sciencedirect.com/science/article/pii/S0022283605803602?via%3Dihub)
