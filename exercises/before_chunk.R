
library(bslib)
library(here)
library(fontawesome)
library(glue)
library(htmltools)
library(knitr)
library(kableExtra)
library(lubridate)
library(readxl)
library(tidyverse)
library(viridis)
library(xaringanExtra)

set.seed(12345)

knitr::opts_chunk$set(
  echo = TRUE,
  collapse = TRUE,
  strip.white = TRUE,
  fig.align = "center",
  fig.asp = 0.7,
  fig.retina = 3,
  dev.args = list(type = "cairo-png")
)

options(
  htmltools.dir.version = FALSE,
  str = strOptions(vec.len = 3)
)

# ggplot theme
ggplot2::theme_set(ggplot2::theme_bw(14))
ggplot2::theme_update(
  panel.grid = element_blank()
)

# insert clipboard button into code chunks
htmltools::tagList(
  xaringanExtra::use_clipboard(
    button_text = "<i class=\"fa fa-clipboard\"></i>",
    success_text = "<i class=\"fa fa-check\" style=\"color: #90BE6D\"></i>",
  ),
  rmarkdown::html_dependency_font_awesome()
)

# xaringanExtra::use_panelset()

# short-hand for loading figures
figure <- function(x) {
  
  full_path <- file.path("images", x)
  
  knitr::include_graphics(full_path)
  
}

# add hyperlink to image
image_link <- function(image, url, ...){
  
  htmltools::a(
    href = url,
    htmltools::img(src=image, ...)
  )
  
}

# these are vicious hacks to handle the fact that 
# the url path in custom_style.css is
# looking in the temp dir for the image
png::writePNG(
  png::readPNG("images/caution.png"), 
  file.path(tempdir(), "caution.png")
)

png::writePNG(
  png::readPNG("images/fyi.png"), 
  file.path(tempdir(), "fyi.png")
)

# fyi.png from 
# https://desiree.rbind.io/post/2019/making-tip-boxes-with-bookdown-and-rmarkdown/