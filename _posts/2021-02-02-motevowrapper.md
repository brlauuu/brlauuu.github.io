# MotEvo wrapper

For one of my projects, I used MotEvo, [MotEvo](https://pubmed.ncbi.nlm.nih.gov/22334039/) (Arnold et al. 2012) is a Bayesian probabilistic model for prediction of transcription factor binding sites (TFBSs) for a given set of position weight matrices (PWMs) and DNA sequences. It was developed by van Nimwegen lab at the Biozentrum (University of Basel, Switzerland) and it can be acquired [here](https://swissregulon.unibas.ch/sr/software).

I recently wrote a simple wrapper for MotEvo to be ran in Python. I also went ahead and published it to PyPi server so it can be installed by simply running:

```bash
pip install motevowrapper
```

More details (with full documentation hopefully soon) can be found on the [repository page](https://github.com/brlauuu/motevowrapper).

For all questions or comments, feel free [open an issue](https://github.com/brlauuu/motevowrapper/issues/) or drop me an email.

## References

1. Arnold, Phil, et al. "MotEvo: integrated Bayesian probabilistic methods for inferring regulatory sites and motifs on multiple alignments of DNA sequences." Bioinformatics 28.4 (2012): 487-494.
