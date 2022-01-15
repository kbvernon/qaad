
# a purely R version of this:
# https://github.com/rstudio/distill/issues/158#issuecomment-692138534

rmarkdown::render_site(encoding = 'UTF-8')

### run after building site! ###

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
