
# a purely R version of this:
# https://github.com/rstudio/distill/issues/158#issuecomment-692138534

library(here)

do.call(
  file.remove,
  list(
    list.files(
      here("_site", "exercises"),
      pattern = ".Rmd|.R",
      full.names = TRUE
    )
  )
)

do.call(
  file.remove,
  list(
    list.files(
      here("_site", "slides"),
      pattern = ".Rmd|.R",
      full.names = TRUE
    )
  )
)
