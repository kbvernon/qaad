
# a purely R version of this:
# https://github.com/rstudio/distill/issues/158#issuecomment-692138534

do.call(
  file.remove,
  list(
    list.files(
      here::here("docs", "exercises"),
      pattern = ".Rmd|.R",
      full.names = TRUE
    )
  )
)

do.call(
  file.remove,
  list(
    list.files(
      here::here("docs", "slides"),
      pattern = ".Rmd|.R",
      full.names = TRUE
    )
  )
)
