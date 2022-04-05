
library(bslib)
library(here)
library(fontawesome)
library(glue)
library(htmltools)
library(knitr)
library(kableExtra)
library(lme4)
library(lubridate)
library(readxl)
library(sf)
library(terra)
library(tidyverse)
library(viridis)
library(xaringanExtra)

set.seed(12345)

knitr::opts_chunk$set(
  echo = TRUE,
  warning = FALSE,
  message = FALSE,
  error = FALSE,
  collapse = TRUE,
  strip.white = TRUE,
  fig.align = "center",
  fig.asp = 0.7,
  fig.retina = 3,
  dev.args = list(type = "cairo-png")
)

options(
  digits = 3,
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

